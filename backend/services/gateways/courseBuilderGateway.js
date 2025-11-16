const axios = require('axios');
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

// Phase 08.5 – Outgoing results push with envelope to metrics URL
async function sendCourseBuilderExamResults(payloadObj) {
  // Build envelope body
  const body = {
    requester_service: 'assessment',
    payload: JSON.stringify(payloadObj || {}),
    response: JSON.stringify({
      learner_id: '',
      course_id: '',
      course_name: '',
      exam_type: '',
      passing_grade: 0,
      final_grade: 0,
      passed: false,
    }),
  };
  const url = process.env.INTEGRATION_COURSEBUILDER_METRICS_URL;
  if (!url) throw new Error('INTEGRATION_COURSEBUILDER_METRICS_URL not set');
  const { data } = await axios.post(url, body, { timeout: 10000 });
  return data;
}

// Backward-compatible safe wrapper (uses mock on failure)
async function safePushExamResults(payload) {
  try {
    return await sendCourseBuilderExamResults(payload);
  } catch (err) {
    console.warn('CourseBuilder push results failed, using mock. Reason:', err?.message || err);
    return mockPushExamResults(payload);
  }
}

module.exports = { safeFetchCoverage, safePushExamResults, sendCourseBuilderExamResults };


