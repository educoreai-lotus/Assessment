// Phase 08.5c – Delegates to gateway; no axios/env here
const { sendCourseBuilderExamResults } = require('../gateways/courseBuilderGateway');

exports.sendExamResultsToCourseBuilder = async (payloadObj) => {
  return await sendCourseBuilderExamResults(payloadObj || {});
};


