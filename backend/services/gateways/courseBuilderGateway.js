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
  return json && json.success ? json.data : (json && json.response) || {};
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


