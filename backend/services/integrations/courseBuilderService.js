// Phase 08.5c – Delegates to gateway; no axios/env here
const { sendCourseBuilderExamResults } = require('../gateways/courseBuilderGateway');
const examsService = require('../../core/examsService');

exports.sendExamResultsToCourseBuilder = async (payloadObj) => {
  return await sendCourseBuilderExamResults(payloadObj || {});
};

// Phase 09 – Inbound handler for Course Builder
exports.handleInbound = async (payload) => {
  const action = String(payload?.action || '').toLowerCase();
  if (action !== 'start-postcourse-exam') {
    return { error: 'unsupported_action' };
  }

  // Normalize learner_id → user_id
  const user_id = payload?.learner_id;
  const course_id = payload?.course_id;
  const course_name = payload?.course_name;

  // Extract skills from coverage_map (for completeness; createExam handles coverage via gateway when needed)
  const coverage_map = Array.isArray(payload?.coverage_map) ? payload.coverage_map : [];
  const skills = coverage_map.flatMap((item) => Array.isArray(item?.skills) ? item.skills : []);
  void skills; // parsed but not required here

  // Create postcourse exam
  const created = await examsService.createExam({
    user_id,
    exam_type: 'postcourse',
    course_id,
    course_name,
  });

  return {
    status: 'postcourse-created',
    exam_id: created?.exam_id ?? null,
    exam_type: 'postcourse',
    course_id: course_id ?? null,
    user_id: user_id ?? null,
    redirect_to: '/app/courses', // placeholder
  };
};

