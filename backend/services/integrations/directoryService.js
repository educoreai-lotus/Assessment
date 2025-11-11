const axios = require('axios');

function getBaseUrl() {
  const base = process.env.DIRECTORY_BASE_URL;
  if (!base) throw new Error('DIRECTORY_BASE_URL not set');
  return base.replace(/\/+$/, '');
}

exports.fetchPolicy = async (examType) => {
  const base = getBaseUrl();
  const url = `${base}/api/directory/policy/${encodeURIComponent(examType)}`;
  const { data } = await axios.get(url, { timeout: 10000 });
  return data;
};

exports.pushExamResults = async (payload) => {
  const base = getBaseUrl();
  const url = `${base}/api/directory/exam-results`;
  const { data } = await axios.post(url, payload, { timeout: 10000 });
  return data;
};


