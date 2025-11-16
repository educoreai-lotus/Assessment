const axios = require('axios');
const { mockFetchBaselineSkills, mockPushAssessmentResults } = require('../mocks/skillsEngineMock');

function getBaseUrl() {
  const base = process.env.SKILLS_ENGINE_BASE_URL;
  if (!base) throw new Error('SKILLS_ENGINE_BASE_URL not set');
  return base.replace(/\/+$/, '');
}

async function tryFetchBaselineSkillsReal(params) {
  const base = getBaseUrl();
  const url = `${base}/api/skills-engine/baseline-readiness`;
  const { data } = await axios.get(url, { params, timeout: 10000 });
  return data;
}

async function safeFetchBaselineSkills(params) {
  try {
    return await tryFetchBaselineSkillsReal(params);
  } catch (err) {
    console.warn('SkillsEngine baseline fetch failed, using mock. Reason:', err?.message || err);
    return mockFetchBaselineSkills(params || {});
  }
}

async function safePushAssessmentResults(payload) {
  try {
    const base = getBaseUrl();
    const url = `${base}/api/skills-engine/assessment-results`;
    const body = {
      requester_service: 'assessment',
      payload: JSON.stringify(payload || {}),
      response: JSON.stringify({ status: 'accepted' }),
    };
    const { data } = await axios.post(url, body, { timeout: 15000 });
    const raw = data?.response ?? null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return raw; }
    }
    return raw;
  } catch (err) {
    console.warn('SkillsEngine push results failed, using mock. Reason:', err?.message || err);
    return mockPushAssessmentResults(payload);
  }
}

module.exports = { safeFetchBaselineSkills, safePushAssessmentResults };


