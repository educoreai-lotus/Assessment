const axios = require('axios');

function getBaseUrl() {
  const base = process.env.SKILLS_ENGINE_BASE_URL;
  if (!base) throw new Error('SKILLS_ENGINE_BASE_URL not set');
  return base.replace(/\/+$/, '');
}

exports.sendResultsToSkillsEngine = async (payload) => {
  const base = getBaseUrl();
  const url = `${base}/api/skills-engine/assessment-results`;
  const { data } = await axios.post(url, payload, { timeout: 10000 });
  return data;
};


