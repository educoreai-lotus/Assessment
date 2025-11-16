// Phase 08.5c – Delegates to gateway; no axios/env here
const { safeFetchPolicy, safePushExamResults } = require('../gateways/directoryGateway');

exports.fetchPolicy = async (examType) => {
  return await safeFetchPolicy(examType);
};

exports.pushExamResults = async (payloadObj) => {
  return await safePushExamResults(payloadObj || {});
};

// Phase 08.6 – Universal inbound handler
exports.handleInbound = async (payload, responseTemplate) => {
  const resp = typeof responseTemplate === 'object' && responseTemplate !== null ? responseTemplate : {};
  return { ...resp };
};


