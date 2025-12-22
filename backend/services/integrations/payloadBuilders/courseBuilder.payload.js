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

// Result payload builder: construct canonical shape expected by Course Builder
// Pass through important fields and map legacy learner_* to user_*
function buildCourseBuilderResultPayload(input = {}) {
  const out = {
    action: input.action || 'postcourse-exam-result',
    route: input.route || { destination: 'course-builder-service', strict: true },
    // Canonical identifiers
    user_id: input.user_id ?? input.learner_id ?? null,
    user_name: input.user_name ?? input.learner_name ?? null,
    course_id: input.course_id ?? null,
    course_name: input.course_name ?? null,
    exam_id: input.exam_id ?? null,
    attempt_id: input.attempt_id ?? null,
    exam_type: input.exam_type || 'postcourse',
    // Outcome
    passing_grade: input.passing_grade != null ? Number(input.passing_grade) : undefined,
    final_grade: input.final_grade != null ? Number(input.final_grade) : undefined,
    passed: input.passed != null ? !!input.passed : undefined,
    // Extra keys are intentionally not added to avoid leaking internal data
  };
  // Remove undefined keys (Coordinator prefers compact envelopes)
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

module.exports = {
  buildCourseBuilderCoveragePayload,
  buildCourseBuilderResultPayload,
};


