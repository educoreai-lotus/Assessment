const { sendTheoreticalToDevLab, sendCodingResultsToDevLab } = require('../integrations/devlabService');
const { mockGetCodingQuestions, mockRequestTheoreticalValidation, mockGradeCodingAnswers } = require('../mocks/devlabMock');
const axios = require('axios');

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

// Phase 08.2 – Shared envelope helpers (Assessment → DevLab → Assessment)
async function sendToDevlab(payload, requesterService = 'Devlab') {
  const url = process.env.INTEGRATION_DEVLAB_DATA_REQUEST_URL;
  if (!url) {
    throw new Error('INTEGRATION_DEVLAB_DATA_REQUEST_URL not set');
  }
  const body = {
    requester_service: requesterService,
    payload,
    response: { answer: '' },
  };
  const { data } = await axios.post(url, body, { timeout: 15000 });
  return data?.response?.answer;
}

async function requestCodingQuestions({ amount, skills, humanLanguage = 'en', difficulty = 'medium' }) {
  const answer = await sendToDevlab(
    {
      action: 'coding',
      amount,
      difficulty,
      humanLanguage,
      skills,
    },
    'Devlab',
  );
  return answer;
}

module.exports = {
  safeGetCodingQuestions,
  safeRequestTheoreticalValidation,
  safeSendCodingResults,
  safeGradeCodingAnswers,
  // new exports
  sendToDevlab,
  requestCodingQuestions,
};


