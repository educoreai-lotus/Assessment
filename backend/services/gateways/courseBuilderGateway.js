const { mockFetchCoverage, mockPushExamResults } = require('../mocks/courseBuilderMock');
const { sendToCoordinator } = require('../integrations/envelopeSender');
const { buildCourseBuilderCoveragePayload, buildCourseBuilderResultPayload } = require('../integrations/payloadBuilders/courseBuilder.payload');
const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

function getCoordinatorUrl() {
  const base = process.env.COORDINATOR_URL;
  if (!base) throw new Error('COORDINATOR_URL not set');
  return String(base).replace(/\/+$/, '');
}

async function safeFetchCoverage(params) {
  try {
    const payload = buildCourseBuilderCoveragePayload(params || {});
    const ret = await sendToCoordinator({ targetService: 'course-builder-service', payload }).catch(() => ({}));
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');
    const coverage = resp?.response?.coverage_map;
    const isEmptyArray = Array.isArray(coverage) && coverage.length === 0;
    const hasCoverage = Array.isArray(coverage) && coverage.length > 0;
    if (!hasCoverage || isEmptyArray) {
      try { console.log('[MOCK-FALLBACK][CourseBuilder][coverage]', { hasParams: !!params }); } catch {}
      return mockFetchCoverage(params || {});
    }
    return { coverage_map: coverage };
  } catch (err) {
    console.warn('CourseBuilder coverage fetch via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockFetchCoverage(params || {});
  }
}

// Strict coverage fetcher for post-course: no mock fallback, flexible shape parsing
async function strictFetchCoverage(params) {
  const payload = buildCourseBuilderCoveragePayload(params || {});
  const ret = await sendToCoordinator({ targetService: 'course-builder-service', payload });
  let respString;
  if (typeof ret === 'string') respString = ret;
  else if (ret && typeof ret.data === 'string') respString = ret.data;
  else respString = JSON.stringify((ret && ret.data) || {});
  const resp = JSON.parse(respString || '{}');
  const coverage =
    (resp?.response && resp.response.coverage_map) ??
    (resp?.payload && resp.payload.coverage_map) ??
    resp?.coverage_map ??
    null;
  if (!coverage || !Array.isArray(coverage) || coverage.length === 0) {
    try { console.error('[POSTCOURSE][COVERAGE][MISSING]', { coord_keys: Object.keys(resp || {}) }); } catch {}
    throw new Error('coverage_snapshot_missing');
  }
  return { coverage_map: coverage };
}

// Outgoing results push through Coordinator
async function sendCourseBuilderExamResults(payloadObj) {
  const shaped = buildCourseBuilderResultPayload(payloadObj || {});
  const ret = await sendToCoordinator({ targetService: 'course-builder-service', payload: shaped }).catch(() => ({}));
  let respString;
  if (typeof ret === 'string') respString = ret;
  else if (ret && typeof ret.data === 'string') respString = ret.data;
  else respString = JSON.stringify((ret && ret.data) || {});
  const resp = JSON.parse(respString || '{}');
  const out = resp?.response?.answer;
  const isEmptyObject = out && typeof out === 'object' && !Array.isArray(out) && Object.keys(out).length === 0;
  const isEmptyArray = Array.isArray(out) && out.length === 0;
  if (!out || isEmptyObject || isEmptyArray) {
    try { console.log('[MOCK-FALLBACK][CourseBuilder][push-results]', { hasPayload: !!payloadObj }); } catch {}
    return mockPushExamResults(payloadObj);
  }
  return out;
}

// Backward-compatible safe wrapper (uses mock on failure)
async function safePushExamResults(payload) {
  try {
    return await sendCourseBuilderExamResults(payload);
  } catch (err) {
    console.warn('CourseBuilder push results via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockPushExamResults(payload);
  }
}

module.exports = { safeFetchCoverage, strictFetchCoverage, safePushExamResults, sendCourseBuilderExamResults };


