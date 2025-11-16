// Phase 08.5c – Delegates to gateway; no axios/env here
const { safePushAssessmentResults } = require('../gateways/skillsEngineGateway');

exports.sendResultsToSkillsEngine = async (payloadObj) => {
  return await safePushAssessmentResults(payloadObj || {});
};


