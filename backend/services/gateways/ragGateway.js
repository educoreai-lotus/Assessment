const axios = require('axios');
const { mockIncident, mockAcknowledgeDecision } = require('../mocks/ragMock');

function getBaseUrl() {
  const base = process.env.RAG_BASE_URL;
  if (!base) throw new Error('RAG_BASE_URL not set');
  return base.replace(/\/+$/, '');
}

async function safeReceiveIncident() {
  try {
    return await mockIncident();
  } catch {
    return mockIncident();
  }
}

async function safePushIncidentDecision(payload) {
  try {
    const base = getBaseUrl();
    const url = `${base}/api/rag/incident-response`;
    const envelope = {
      service_requester: 'Assessment',
      payload: payload || {},
      response: {},
    };
    const { data } = await axios.post(url, envelope, { timeout: 15000 });
    return data;
  } catch (err) {
    console.warn('RAG push incident decision failed, using mock. Reason:', err?.message || err);
    return mockAcknowledgeDecision(payload);
  }
}

module.exports = { safeReceiveIncident, safePushIncidentDecision };


