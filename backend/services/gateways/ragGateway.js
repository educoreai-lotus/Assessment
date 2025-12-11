const { mockIncident, mockAcknowledgeDecision } = require('../mocks/ragMock');
const { postToCoordinator } = require('./coordinatorClient');
const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

async function safeReceiveIncident() {
  try {
    return await mockIncident();
  } catch {
    return mockIncident();
  }
}

async function safePushIncidentDecision(payload) {
  try {
    const envelope = {
      requester_service: SERVICE_NAME,
      target_service: 'rag-service',
      payload: {
        action: 'incident-decision',
        ...(payload || {}),
      },
      response: { answer: '' },
    };
    const ret = await postToCoordinator(envelope).catch(() => ({}));
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');
    const out = resp?.response?.answer;
    if (!out) throw new Error('rag_push_decision_failed');
    return out;
  } catch (err) {
    console.warn('RAG push incident decision failed, using mock. Reason:', err?.message || err);
    return mockAcknowledgeDecision(payload);
  }
}

module.exports = { safeReceiveIncident, safePushIncidentDecision };


