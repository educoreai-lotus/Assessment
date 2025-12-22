function buildCourseBuilderCoveragePayload(params = {}) {
  const userId = params && params.user_id != null ? String(params.user_id) : undefined;
  const payload = {
    action: 'coverage_map',
    route: { destination: 'course-builder-service', strict: true },
    ...params,
  };
  // Boundary adapter: Course Builder coverage still expects learner_id
  if (userId && payload.learner_id == null) {
    payload.learner_id = userId;
  }
  return payload;
}

// Flexible builder: accepts either a pre-shaped flat object (with optional route),
// or nested { learner, course, exam } object and adds default route.
function buildCourseBuilderResultPayload(input = {}) {
  // If caller passed a flat, already-shaped payload, normalize and keep route
  if (
    Object.prototype.hasOwnProperty.call(input, 'learner_id') ||
    Object.prototype.hasOwnProperty.call(input, 'course_id') ||
    Object.prototype.hasOwnProperty.call(input, 'exam_id') ||
    Object.prototype.hasOwnProperty.call(input, 'route')
  ) {
    return {
      action: input.action || 'postcourse-exam-result',
      learner_id: input.learner_id ?? null,
      learner_name: input.learner_name ?? null,
      course_id: input.course_id ?? null,
      course_name: input.course_name ?? null,
      exam_id: input.exam_id ?? null,
      attempt_id: input.attempt_id ?? null,
      exam_type: input.exam_type || 'postcourse',
      route: input.route || { destination: 'course-builder-service', strict: true },
    };
  }

  const { learner, course, exam } = input || {};
  return {
    action: 'postcourse-exam-result',
    learner_id: learner?.learner_id ?? learner?.user_id ?? null,
    learner_name: learner?.learner_name ?? learner?.user_name ?? null,
    course_id: course?.course_id ?? null,
    course_name: course?.course_name ?? null,
    exam_id: exam?.exam_id ?? null,
    attempt_id: exam?.attempt_id ?? null,
    exam_type: exam?.exam_type ?? 'postcourse',
    route: { destination: 'course-builder-service', strict: true },
  };
}

module.exports = {
  buildCourseBuilderCoveragePayload,
  buildCourseBuilderResultPayload,
};


