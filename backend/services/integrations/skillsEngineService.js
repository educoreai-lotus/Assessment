// Phase 08.5c – Delegates to gateway; no axios/env here
const { safePushAssessmentResults } = require('../gateways/skillsEngineGateway');

exports.sendResultsToSkillsEngine = async (payloadObj) => {
  return await safePushAssessmentResults(payloadObj || {});
};

// Phase 08.6 – Universal inbound handler
exports.handleInbound = async (payload, responseTemplate) => {
  const resp = typeof responseTemplate === 'object' && responseTemplate !== null ? responseTemplate : {};
  return { ...resp };
};


