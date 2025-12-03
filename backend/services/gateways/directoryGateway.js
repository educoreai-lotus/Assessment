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
    const success = !!json && (json.success === true || typeof json.response === 'object');
    const data = json && json.success ? json.data : (json && json.response) || {};
    const isEmptyObject = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0;
    const isEmptyArray = Array.isArray(data) && data.length === 0;
    if (!json || !success || !data || isEmptyObject || isEmptyArray) {
      try { console.log('[MOCK-FALLBACK][Directory][policy]', { examType }); } catch {}
      return mockFetchPolicy(examType);
    }
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
    const success = !!json && (json.success === true || typeof json.response === 'object');
    const isEmptyObject = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0;
    const isEmptyArray = Array.isArray(data) && data.length === 0;
    if (!json || !success || !data || isEmptyObject || isEmptyArray) {
      try { console.log('[MOCK-FALLBACK][Directory][results]', { hasPayload: !!payload }); } catch {}
      return mockPushExamResults(payload);
    }
    return data;
  } catch (err) {
    console.warn('Directory pushExamResults via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockPushExamResults(payload);
  }
}

module.exports = { safeFetchPolicy, safePushExamResults };


