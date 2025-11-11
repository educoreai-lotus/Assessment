const axios = require('axios');

function getBaseUrl() {
  const base = process.env.COURSE_BUILDER_BASE_URL;
  if (!base) throw new Error('COURSE_BUILDER_BASE_URL not set');
  return base.replace(/\/+$/, '');
}

exports.sendExamResultsToCourseBuilder = async (payload) => {
  const base = getBaseUrl();
  const url = `${base}/api/course-builder/exam-results`;
  const { data } = await axios.post(url, payload, { timeout: 10000 });
  return data;
};


