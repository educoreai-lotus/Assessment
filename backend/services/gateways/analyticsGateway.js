const { mockBaselineAnalytics, mockPostcourseAnalytics } = require('../mocks/analyticsMock');

async function safeGetBaselineAnalytics() {
  try {
    return await mockBaselineAnalytics();
  } catch {
    return mockBaselineAnalytics();
  }
}

async function safeGetPostcourseAnalytics() {
  try {
    return await mockPostcourseAnalytics();
  } catch {
    return mockPostcourseAnalytics();
  }
}

module.exports = { safeGetBaselineAnalytics, safeGetPostcourseAnalytics };


