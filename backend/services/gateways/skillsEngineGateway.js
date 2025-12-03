const { mockFetchBaselineSkills, mockPushAssessmentResults } = require('../mocks/skillsEngineMock');

function getCoordinatorUrl() {
  const base = process.env.COORDINATOR_URL;
  if (!base) throw new Error('COORDINATOR_URL not set');
  return String(base).replace(/\/+$/, '');
}

async function safeFetchBaselineSkills(params) {
  try {
    const url = `${getCoordinatorUrl()}/api/fill-content-metrics/`;
    const body = {
      requester_service: 'assessment-service',
      payload: {
        action: 'fetch baseline readiness skills from Skills Engine',
        ...(params || {}),
      },
      response: {
        skills: [],
        passing_grade: 0,
      },
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await resp.json().catch(() => ({}));
    const data = json && json.success ? json.data : (json && json.response) || {};
    const success = !!json && (json.success === true || typeof json.response === 'object');
    const isEmptyObject = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0;
    const isEmptyArray = Array.isArray(data) && data.length === 0;
    if (!json || !success || !data || isEmptyObject || isEmptyArray) {
      try { console.log('[MOCK-FALLBACK][SkillsEngine][baseline-skills]', { hasParams: !!params }); } catch {}
      return mockFetchBaselineSkills(params || {});
    }
    return data;
  } catch (err) {
    console.warn('SkillsEngine baseline fetch via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockFetchBaselineSkills(params || {});
  }
}

async function safePushAssessmentResults(payload) {
  try {
    const url = `${getCoordinatorUrl()}/api/fill-content-metrics/`;
    const body = {
      requester_service: 'assessment-service',
      payload: {
        action: 'push assessment results to Skills Engine',
        ...(payload || {}),
      },
      response: {
        ok: true,
      },
    };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await resp.json().catch(() => ({}));
    const data = json && json.success ? json.data : (json && json.response) || {};
    const success = !!json && (json.success === true || typeof json.response === 'object');
    const isEmptyObject = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0;
    const isEmptyArray = Array.isArray(data) && data.length === 0;
    if (!json || !success || !data || isEmptyObject || isEmptyArray) {
      try { console.log('[MOCK-FALLBACK][SkillsEngine][push-results]', { hasPayload: !!payload }); } catch {}
      return mockPushAssessmentResults(payload);
    }
    return data;
  } catch (err) {
    console.warn('SkillsEngine push results via Coordinator failed, using mock. Reason:', err?.message || err);
    return mockPushAssessmentResults(payload);
  }
}

module.exports = { safeFetchBaselineSkills, safePushAssessmentResults };


