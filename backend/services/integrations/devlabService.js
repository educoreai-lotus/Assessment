const axios = require('axios');

function getBaseUrl() {
  const base = process.env.DEVLAB_BASE_URL;
  if (!base) throw new Error('DEVLAB_BASE_URL not set');
  return base.replace(/\/+$/, '');
}

exports.sendTheoreticalToDevLab = async (payload) => {
  const base = getBaseUrl();
  const url = `${base}/api/devlab/theoretical`;
  const { data } = await axios.post(url, payload, { timeout: 10000 });
  return data;
};

exports.sendCodingResultsToDevLab = async (payload) => {
  const base = getBaseUrl();
  const url = `${base}/api/devlab/results`;
  const { data } = await axios.post(url, payload, { timeout: 10000 });
  return data;
};

// Phase 08.2 – Build coding questions using unified envelope via gateway
const devlabGateway = require('../gateways/devlabGateway');

exports.buildCodingQuestionsForExam = async ({
  amount,
  skills,
  humanLanguage = 'en',
  difficulty = 'medium',
}) => {
  const codingQuestions = await devlabGateway.requestCodingQuestions({
    amount,
    skills,
    humanLanguage,
    difficulty,
  });
  const now = new Date();
  return (codingQuestions || []).map((q) => ({
    ...q,
    skills,
    humanLanguage,
    difficulty,
    requested_at: now,
  }));
};


