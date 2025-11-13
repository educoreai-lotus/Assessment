const { sendIncidentDecisionToRag } = require('../integrations/ragService');
const { mockIncident, mockAcknowledgeDecision } = require('../mocks/ragMock');

async function safeReceiveIncident() {
  try {
    return await mockIncident();
  } catch {
    return mockIncident();
  }
}

async function safePushIncidentDecision(payload) {
  try {
    return await sendIncidentDecisionToRag(payload);
  } catch (err) {
    console.warn('RAG push incident decision failed, using mock. Reason:', err?.message || err);
    return mockAcknowledgeDecision(payload);
  }
}

module.exports = { safeReceiveIncident, safePushIncidentDecision };


