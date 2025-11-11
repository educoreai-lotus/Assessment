const axios = require('axios');

function getBaseUrl() {
  const base = process.env.RAG_BASE_URL;
  if (!base) throw new Error('RAG_BASE_URL not set');
  return base.replace(/\/+$/, '');
}

exports.sendIncidentDecisionToRag = async (payload) => {
  const base = getBaseUrl();
  const url = `${base}/api/rag/incident-response`;
  const { data } = await axios.post(url, payload, { timeout: 10000 });
  return data;
};


