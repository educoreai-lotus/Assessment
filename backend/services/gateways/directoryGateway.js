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
    const envelope = {
      service_requester: 'Assessment',
      payload: payload || {},
      response: {},
    };
    const { data } = await axios.post(url, envelope, { timeout: 15000 });
    return data;
  } catch (err) {
    console.warn('Directory pushExamResults failed, using mock. Reason:', err?.message || err);
    return mockPushExamResults(payload);
  }
}

module.exports = { safeFetchPolicy, safePushExamResults };


