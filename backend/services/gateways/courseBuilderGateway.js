const { mockFetchCoverage, mockPushExamResults } = require('../mocks/courseBuilderMock');
const { postToCoordinator } = require('./coordinatorClient');
const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

function getCoordinatorUrl() {
  const base = process.env.COORDINATOR_URL;
  if (!base) throw new Error('COORDINATOR_URL not set');
  return String(base).replace(/\/+$/, '');
}

async function safeFetchCoverage(params) {
  try {
    const envelope = {
      requester_service: SERVICE_NAME,
      payload: {
        action: 'fetch-coverage-map',
        ...(params || {}),
      },
      response: { answer: '' },
    };
    const ret = await postToCoordinator(envelope).catch(() => ({}));
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');
    const answer = resp?.response?.answer;
    const isEmptyObject = answer && typeof answer === 'object' && !Array.isArray(answer) && Object.keys(answer).length === 0;
    const isEmptyArray = Array.isArray(answer) && answer.length === 0;
    const hasCoverage = !!(answer && Array.isArray(answer.coverage_map) && answer.coverage_map.length > 0);
    if (!answer || isEmptyObject || isEmptyArray || !hasCoverage) {
      try { console.log('[MOCK-FALLBACK][CourseBuilder][coverage]', { hasParams: !!params }); } catch {}
      return mockFetchCoverage(params || {});
    }
    return answer;
  } catch (err) {
    console.warn('CourseBuilder coverage fetch via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockFetchCoverage(params || {});
  }
}

// Outgoing results push through Coordinator
async function sendCourseBuilderExamResults(payloadObj) {
  const envelope = {
    requester_service: SERVICE_NAME,
    payload: {
      action: 'postcourse-exam-result',
      ...(payloadObj || {}),
    },
    response: { answer: '' },
  };
  const ret = await postToCoordinator(envelope).catch(() => ({}));
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

module.exports = { safeFetchCoverage, safePushExamResults, sendCourseBuilderExamResults };


