const { mockFetchPolicy, mockPushExamResults } = require('../mocks/directoryMock');

function getCoordinatorUrl() {
  const base = process.env.COORDINATOR_URL;
  if (!base) throw new Error('COORDINATOR_URL not set');
  return String(base).replace(/\/+$/, '');
}

async function safeFetchPolicy(examType) {
  try {
    const url = `${getCoordinatorUrl()}/api/fill-content-metrics/`;
    const body = {
      requester_service: 'assessment-service',
      payload: {
        action: `fetch Directory policy for exam type "${String(examType)}"`,
        exam_type: examType,
      },
      response: {
        passing_grade: 0,
        max_attempts: 0,
      },
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await resp.json().catch(() => ({}));
    // Prefer new shape { success, data }, fallback to legacy { response }
    const data = json && json.success ? json.data : (json && json.response) || {};
    return data;
  } catch (err) {
    console.warn('Directory fetchPolicy via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockFetchPolicy(examType);
  }
}

async function safePushExamResults(payload) {
  try {
    const url = `${getCoordinatorUrl()}/api/fill-content-metrics/`;
    const body = {
      requester_service: 'assessment-service',
      payload: {
        action: 'push exam results to Directory',
        ...(payload || {}),
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
    const data = json && json.success ? json.data : (json && json.response) || {};
    return data;
  } catch (err) {
    console.warn('Directory pushExamResults via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockPushExamResults(payload);
  }
}

module.exports = { safeFetchPolicy, safePushExamResults };


