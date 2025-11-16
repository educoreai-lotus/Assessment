const { safeGetBaselineAnalytics, safeGetPostcourseAnalytics } = require('../gateways/analyticsGateway');

// Phase 08.6 – Universal inbound handler for Learning Analytics
// If payload.exam_type === 'baseline' return baseline analytics, otherwise postcourse.
exports.handleInbound = async (payload, responseTemplate) => {
  const type = typeof payload?.exam_type === 'string' ? payload.exam_type.toLowerCase() : 'postcourse';
  if (type === 'baseline') {
    return await safeGetBaselineAnalytics();
  }
  return await safeGetPostcourseAnalytics();
};


