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
    const body = {
      requester_service: 'assessment',
      payload: JSON.stringify(payload || {}),
      response: JSON.stringify({ status: 'acknowledged' }),
    };
    const { data } = await axios.post(url, body, { timeout: 15000 });
    const raw = data?.response ?? null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return raw; }
    }
    return raw;
  } catch (err) {
    console.warn('RAG push incident decision failed, using mock. Reason:', err?.message || err);
    return mockAcknowledgeDecision(payload);
  }
}

module.exports = { safeReceiveIncident, safePushIncidentDecision };


