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
      target_service: 'skills-engine',
      payload: {
        action: 'fetch-baseline-skills',
        ...(params || {}),
      },
      response: { answer: '' },
    };
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
      target_service: 'skills-engine',
      payload: {
        action: 'baseline-exam-result',
        ...(payload || {}),
      },
      response: { answer: '' },
    };
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
    return answer;
  } catch (err) {
    console.warn('SkillsEngine push results via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockPushAssessmentResults(payload);
  }
}

module.exports = { safeFetchBaselineSkills, safePushAssessmentResults };


