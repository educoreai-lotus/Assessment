// Phase 08.5c – Delegates to gateway; no axios/env here
const { sendCourseBuilderExamResults } = require('../gateways/courseBuilderGateway');

exports.sendExamResultsToCourseBuilder = async (payloadObj) => {
  return await sendCourseBuilderExamResults(payloadObj || {});
};

// Phase 08.6 – Universal inbound handler
exports.handleInbound = async (payload, responseTemplate) => {
  // For now, just echo back the provided response template
  const resp = typeof responseTemplate === 'object' && responseTemplate !== null ? responseTemplate : {};
  return { ...resp };
};


