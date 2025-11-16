const axios = require('axios');
const { mockFetchPolicy, mockPushExamResults } = require('../mocks/directoryMock');

function getBaseUrl() {
  const base = process.env.DIRECTORY_BASE_URL;
  if (!base) throw new Error('DIRECTORY_BASE_URL not set');
  return base.replace(/\/+$/, '');
}

async function safeFetchPolicy(examType) {
  try {
    // Keep GET for policy fetch (no envelope)
    const base = getBaseUrl();
    const url = `${base}/api/directory/policy/${encodeURIComponent(examType)}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    return data;
  } catch (err) {
    console.warn('Directory fetchPolicy failed, using mock. Reason:', err?.message || err);
    return mockFetchPolicy(examType);
  }
}

async function safePushExamResults(payload) {
  try {
    const base = getBaseUrl();
    const url = `${base}/api/directory/exam-results`;
    const body = {
      requester_service: 'assessment',
      payload: JSON.stringify(payload || {}),
      response: JSON.stringify({ status: 'accepted' }),
    };
    const { data } = await axios.post(url, body, { timeout: 15000 });
    const raw = data?.response ?? null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return raw; }
    }
    return raw;
  } catch (err) {
    console.warn('Directory pushExamResults failed, using mock. Reason:', err?.message || err);
    return mockPushExamResults(payload);
  }
}

module.exports = { safeFetchPolicy, safePushExamResults };


