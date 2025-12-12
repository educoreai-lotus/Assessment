const { mockBaselineAnalytics, mockPostcourseAnalytics } = require('../mocks/analyticsMock');
const { postToCoordinator } = require('./coordinatorClient');
const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

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

async function sendAnalyticsData(dataPayload) {
  const envelope = {
    requester_service: SERVICE_NAME,
    payload: {
      action: 'provide-exam-analytics',
      ...(dataPayload || {}),
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
  if (!out) throw new Error('analytics_push_failed');
  return out;
}

module.exports = { safeGetBaselineAnalytics, safeGetPostcourseAnalytics, sendAnalyticsData };


