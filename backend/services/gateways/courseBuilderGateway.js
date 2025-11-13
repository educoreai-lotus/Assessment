const axios = require('axios');
const { sendExamResultsToCourseBuilder } = require('../integrations/courseBuilderService');
const { mockFetchCoverage, mockPushExamResults } = require('../mocks/courseBuilderMock');

function getBaseUrl() {
  const base = process.env.COURSE_BUILDER_BASE_URL;
  if (!base) throw new Error('COURSE_BUILDER_BASE_URL not set');
  return base.replace(/\/+$/, '');
}

async function tryFetchCoverageReal(params) {
  const base = getBaseUrl();
  const url = `${base}/api/course-builder/coverage`;
  const { data } = await axios.get(url, { params, timeout: 10000 });
  return data;
}

async function safeFetchCoverage(params) {
  try {
    return await tryFetchCoverageReal(params);
  } catch (err) {
    console.warn('CourseBuilder coverage fetch failed, using mock. Reason:', err?.message || err);
    return mockFetchCoverage(params || {});
  }
}

async function safePushExamResults(payload) {
  try {
    return await sendExamResultsToCourseBuilder(payload);
  } catch (err) {
    console.warn('CourseBuilder push results failed, using mock. Reason:', err?.message || err);
    return mockPushExamResults(payload);
  }
}

module.exports = { safeFetchCoverage, safePushExamResults };


