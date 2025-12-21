function buildCourseBuilderCoveragePayload(params = {}) {
  return {
    action: 'coverage_map',
    route: { destination: 'course-builder-service', strict: true },
    ...params,
  };
}

function buildCourseBuilderResultPayload({ learner, course, exam } = {}) {
  return {
    action: 'postcourse-exam-result',
    learner_id: learner?.learner_id ?? learner?.user_id ?? null,
    learner_name: learner?.learner_name ?? learner?.user_name ?? null,
    course_id: course?.course_id ?? null,
    course_name: course?.course_name ?? null,
    exam_id: exam?.exam_id ?? null,
    attempt_id: exam?.attempt_id ?? null,
    exam_type: exam?.exam_type ?? 'postcourse',
  };
}

module.exports = {
  buildCourseBuilderCoveragePayload,
  buildCourseBuilderResultPayload,
};


