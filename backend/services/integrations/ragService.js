// Phase 08.5c – Delegates to gateway; no axios/env here
const { safePushIncidentDecision } = require('../gateways/ragGateway');
const { getAttemptsForUser } = require('../core/attemptsService');

exports.sendIncidentDecisionToRag = async (payloadObj) => {
  return await safePushIncidentDecision(payloadObj || {});
};

// Phase 09 – Inbound handler (minimal RAG placeholder)
exports.handleInbound = async (payload) => {
  const action = String(payload?.action || '').toLowerCase();
  if (action !== 'ask-assessment') {
    return { error: 'unsupported_action' };
  }
  const user_id = payload?.user_id;
  const attempts = await getAttemptsForUser(user_id);
  const last = (attempts || [])[0] || {};
  const score = last?.final_grade != null ? Number(last.final_grade) : null;
  return {
    result: score != null ? `User scored ${score} on the last exam.` : 'No exam score found.',
  };
};


