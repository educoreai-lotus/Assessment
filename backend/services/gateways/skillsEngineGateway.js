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
    const envelope = {
      service_requester: 'Assessment',
      payload: payload || {},
      response: {},
    };
    const { data } = await axios.post(url, envelope, { timeout: 15000 });
    return data;
  } catch (err) {
    console.warn('SkillsEngine push results failed, using mock. Reason:', err?.message || err);
    return mockPushAssessmentResults(payload);
  }
}

module.exports = { safeFetchBaselineSkills, safePushAssessmentResults };


