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


