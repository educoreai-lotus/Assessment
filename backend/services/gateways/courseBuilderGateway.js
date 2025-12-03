const { mockFetchCoverage, mockPushExamResults } = require('../mocks/courseBuilderMock');

function getCoordinatorUrl() {
  const base = process.env.COORDINATOR_URL;
  if (!base) throw new Error('COORDINATOR_URL not set');
  return String(base).replace(/\/+$/, '');
}

async function safeFetchCoverage(params) {
  try {
    const url = `${getCoordinatorUrl()}/api/fill-content-metrics/`;
    const body = {
      requester_service: 'assessment-service',
      payload: {
        action: 'fetch course coverage map from Course Builder',
        ...(params || {}),
      },
      response: {
        learner_id: null,
        course_id: null,
        course_name: null,
        coverage_map: [],
      },
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await resp.json().catch(() => ({}));
    const data = json && json.success ? json.data : (json && json.response) || {};
    const success = !!json && (json.success === true || typeof json.response === 'object');
    const isEmptyObject = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0;
    const isEmptyArray = Array.isArray(data) && data.length === 0;
    const hasCoverage = !!(data && Array.isArray(data.coverage_map) && data.coverage_map.length > 0);
    if (!json || !success || !data || isEmptyObject || isEmptyArray || !hasCoverage) {
      try { console.log('[MOCK-FALLBACK][CourseBuilder][coverage]', { hasParams: !!params }); } catch {}
      return mockFetchCoverage(params || {});
    }
    return data;
  } catch (err) {
    console.warn('CourseBuilder coverage fetch via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockFetchCoverage(params || {});
  }
}

// Outgoing results push through Coordinator
async function sendCourseBuilderExamResults(payloadObj) {
  const url = `${getCoordinatorUrl()}/api/fill-content-metrics/`;
  const body = {
    requester_service: 'assessment-service',
    payload: {
      action: 'push post-course exam results to Course Builder',
      ...(payloadObj || {}),
    },
    response: {
      ok: true,
    },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  const out = json && json.success ? json.data : (json && json.response) || {};
  const success = !!json && (json.success === true || typeof json.response === 'object');
  const isEmptyObject = out && typeof out === 'object' && !Array.isArray(out) && Object.keys(out).length === 0;
  const isEmptyArray = Array.isArray(out) && out.length === 0;
  if (!json || !success || !out || isEmptyObject || isEmptyArray) {
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

module.exports = { safeFetchCoverage, safePushExamResults, sendCourseBuilderExamResults };


