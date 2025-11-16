// Phase 08.5c – Delegates to gateway; no axios/env here
const { safePushIncidentDecision } = require('../gateways/ragGateway');

exports.sendIncidentDecisionToRag = async (payloadObj) => {
  return await safePushIncidentDecision(payloadObj || {});
};


