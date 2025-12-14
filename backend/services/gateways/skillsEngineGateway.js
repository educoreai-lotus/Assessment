const { mockFetchBaselineSkills, mockPushAssessmentResults } = require('../mocks/skillsEngineMock');
const { postToCoordinator } = require('./coordinatorClient');
const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

function getCoordinatorUrl() {
  const base = process.env.COORDINATOR_URL;
  if (!base) throw new Error('COORDINATOR_URL not set');
  return String(base).replace(/\/+$/, '');
}

async function safeFetchBaselineSkills(params) {
  try {
    const envelope = {
      requester_service: SERVICE_NAME,
      payload: {
        action: 'fetch-baseline-skills',
        ...(params || {}),
      },
      response: { answer: '' },
    };
    try {
      // eslint-disable-next-line no-console
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][FETCH_SKILLS][REQUEST_PAYLOAD]', {
        payload_keys: Object.keys(envelope.payload || {}),
      });
    } catch {}
    const ret = await postToCoordinator(envelope).catch(() => ({}));
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');
    const answer = resp?.response?.answer;
    const isEmptyObject = answer && typeof answer === 'object' && !Array.isArray(answer) && Object.keys(answer).length === 0;
    const isEmptyArray = Array.isArray(answer) && answer.length === 0;
    if (!answer || isEmptyObject || isEmptyArray) {
      try { console.log('[MOCK-FALLBACK][SkillsEngine][baseline-skills]', { hasParams: !!params }); } catch {}
      return mockFetchBaselineSkills(params || {});
    }
    try {
      // eslint-disable-next-line no-console
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][FETCH_SKILLS][SUCCESS]', {
        received_type: Array.isArray(answer) ? 'array' : (answer && typeof answer),
        count: Array.isArray(answer) ? answer.length : undefined,
      });
      const bodyStr = (() => { try { return JSON.stringify(answer); } catch { return String(answer); } })();
      const snapshot = bodyStr && bodyStr.length > 1500 ? (bodyStr.slice(0, 1500) + '…[truncated]') : bodyStr;
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][FETCH_SKILLS][RESPONSE_BODY]', snapshot);
    } catch {}
    return answer;
  } catch (err) {
    console.warn('SkillsEngine baseline fetch via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockFetchBaselineSkills(params || {});
  }
}

async function safePushAssessmentResults(payload) {
  try {
    const envelope = {
      requester_service: SERVICE_NAME,
      payload: {
        action: 'baseline-exam-result',
        ...(payload || {}),
      },
      response: { answer: '' },
    };
    try {
      const reqStr = (() => { try { return JSON.stringify(envelope.payload); } catch { return String(envelope.payload); } })();
      const reqSnap = reqStr && reqStr.length > 1500 ? (reqStr.slice(0, 1500) + '…[truncated]') : reqStr;
      // eslint-disable-next-line no-console
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][PUSH_RESULTS][REQUEST_PAYLOAD]', reqSnap);
    } catch {}
    const ret = await postToCoordinator(envelope).catch(() => ({}));
    let respString;
    if (typeof ret === 'string') respString = ret;
    else if (ret && typeof ret.data === 'string') respString = ret.data;
    else respString = JSON.stringify((ret && ret.data) || {});
    const resp = JSON.parse(respString || '{}');
    const answer = resp?.response?.answer;
    const isEmptyObject = answer && typeof answer === 'object' && !Array.isArray(answer) && Object.keys(answer).length === 0;
    const isEmptyArray = Array.isArray(answer) && answer.length === 0;
    if (!answer || isEmptyObject || isEmptyArray) {
      try { console.log('[MOCK-FALLBACK][SkillsEngine][push-results]', { hasPayload: !!payload }); } catch {}
      return mockPushAssessmentResults(payload);
    }
    try {
      // eslint-disable-next-line no-console
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][PUSH_RESULTS][SUCCESS]', {
        request_summary: {
          user_id: payload?.user_id ?? null,
          exam_type: payload?.exam_type ?? null,
          skills: Array.isArray(payload?.skills) ? payload.skills.length : 0,
        },
        answer_type: answer && typeof answer,
      });
      const bodyStr = (() => { try { return JSON.stringify(answer); } catch { return String(answer); } })();
      const snapshot = bodyStr && bodyStr.length > 1500 ? (bodyStr.slice(0, 1500) + '…[truncated]') : bodyStr;
      console.log('[OUTBOUND][COORDINATOR][SKILLS_ENGINE][PUSH_RESULTS][RESPONSE_BODY]', snapshot);
    } catch {}
    return answer;
  } catch (err) {
    console.warn('SkillsEngine push results via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockPushAssessmentResults(payload);
  }
}

module.exports = { safeFetchBaselineSkills, safePushAssessmentResults };


