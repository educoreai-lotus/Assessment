const { mockFetchPolicy, mockPushExamResults } = require('../mocks/directoryMock');
const { postToCoordinator } = require('./coordinatorClient');
const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

async function fetchPolicy(examType, userId, courseId) {
  const envelope = {
    requester_service: SERVICE_NAME,
    target_service: 'directory-service',
    payload: {
      action: 'fetch-policy',
      exam_type: examType,
      user_id: userId,
      course_id: courseId,
    },
    response: { answer: '' },
  };
  const ret = await postToCoordinator(envelope);
  let respString;
  if (typeof ret === 'string') respString = ret;
  else if (ret && typeof ret.data === 'string') respString = ret.data;
  else respString = JSON.stringify((ret && ret.data) || {});
  const resp = JSON.parse(respString || '{}');
  const out = resp?.response?.answer;
  if (!out) throw new Error('directory_fetch_policy_failed');
  return out;
}

// Backward-compatible safe wrapper
async function safeFetchPolicy(examType) {
  try {
    return await fetchPolicy(examType, undefined, undefined);
  } catch (err) {
    try { console.log('[MOCK-FALLBACK][Directory][policy]', { examType, reason: err?.message }); } catch {}
    return mockFetchPolicy(examType);
  }
}

// Optional push to Directory (kept for compatibility); now via Coordinator envelope
async function safePushExamResults(payload) {
  try {
    const envelope = {
      requester_service: SERVICE_NAME,
      target_service: 'directory-service',
      payload: {
        action: 'push-exam-results',
        ...(payload || {}),
      },
      response: { answer: '' },
    };
    const ret = await postToCoordinator(envelope);
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');
    const out = resp?.response?.answer;
    if (!out) throw new Error('directory_push_results_failed');
    return out;
  } catch (err) {
    console.warn('Directory pushExamResults via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockPushExamResults(payload);
  }
}

module.exports = { fetchPolicy, safeFetchPolicy, safePushExamResults };


