const { sendTheoreticalToDevLab, sendCodingResultsToDevLab } = require('../integrations/devlabService');
const { mockGetCodingQuestions, mockRequestTheoreticalValidation } = require('../mocks/devlabMock');

async function safeGetCodingQuestions() {
  try {
    return await mockGetCodingQuestions();
  } catch (err) {
    // mock never fails in practice; keep same shape
    return mockGetCodingQuestions();
  }
}

async function safeRequestTheoreticalValidation(payload) {
  try {
    return await sendTheoreticalToDevLab(payload);
  } catch (err) {
    console.warn('DevLab theoretical validation failed, using mock. Reason:', err?.message || err);
    return mockRequestTheoreticalValidation(payload);
  }
}

async function safeSendCodingResults(payload) {
  try {
    return await sendCodingResultsToDevLab(payload);
  } catch (err) {
    console.warn('DevLab coding results push failed, using mock. Reason:', err?.message || err);
    return { status: 'accepted', payload };
  }
}

module.exports = { safeGetCodingQuestions, safeRequestTheoreticalValidation, safeSendCodingResults };


