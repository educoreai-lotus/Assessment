const { sendTheoreticalToDevLab, sendCodingResultsToDevLab } = require('../integrations/devlabService');
const { mockGetCodingQuestions, mockRequestTheoreticalValidation, mockGradeCodingAnswers } = require('../mocks/devlabMock');

async function safeGetCodingQuestions() {
  try {
    return await mockGetCodingQuestions();
  } catch (err) {
    // mock never fails in practice; keep same shape
    return mockGetCodingQuestions();
  }
}

async function safeRequestTheoreticalValidation(payload) {
  // Ensure DevLab receives full theoretical content including hints and metadata
  const forwardedPayload = {
    ...payload,
    question: payload && payload.question ? JSON.parse(JSON.stringify(payload.question)) : undefined,
  };
  try {
    return await sendTheoreticalToDevLab(forwardedPayload);
  } catch (err) {
    console.warn('DevLab theoretical validation failed, using mock. Reason:', err?.message || err);
    return mockRequestTheoreticalValidation(forwardedPayload);
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

async function safeGradeCodingAnswers(payload) {
  // payload: { exam_id, attempt_id, user_id, answers: [{question_id, skill_id, code_answer}] }
  try {
    const resp = await sendCodingResultsToDevLab(payload);
    // Normalize to { results: [...] }
    if (resp && Array.isArray(resp.results)) {
      return resp;
    }
    // If service returns accepted without results, fallback to mock grading
    return await mockGradeCodingAnswers(payload);
  } catch (err) {
    console.warn('DevLab grading unreachable, using mock. Reason:', err?.message || err);
    return await mockGradeCodingAnswers(payload);
  }
}

module.exports = { safeGetCodingQuestions, safeRequestTheoreticalValidation, safeSendCodingResults, safeGradeCodingAnswers };


