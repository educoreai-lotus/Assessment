const { fetchPolicy, pushExamResults } = require('../integrations/directoryService');
const { mockFetchPolicy, mockPushExamResults } = require('../mocks/directoryMock');

async function safeFetchPolicy(examType) {
  try {
    return await fetchPolicy(examType);
  } catch (err) {
    console.warn('Directory fetchPolicy failed, using mock. Reason:', err?.message || err);
    return mockFetchPolicy(examType);
  }
}

async function safePushExamResults(payload) {
  try {
    return await pushExamResults(payload);
  } catch (err) {
    console.warn('Directory pushExamResults failed, using mock. Reason:', err?.message || err);
    return mockPushExamResults(payload);
  }
}

module.exports = { safeFetchPolicy, safePushExamResults };


