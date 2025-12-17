function buildDirectoryPolicyPayload({ exam_type, user_id, course_id } = {}) {
  const isBaseline = String(exam_type) === 'baseline';
  const base = {
    action: 'fetch-policy',
    exam_type: exam_type ?? null,
    user_id: user_id ?? null,
    // Baseline: do not include course_id in the policy request
    ...(isBaseline ? {} : { course_id: course_id ?? null }),
    // Explicit routing hints for Coordinator to avoid misroute to analytics
    route: { destination: 'directory', strict: true },
  };
  return base;
}

function buildDirectoryResultPayload({ user, exam } = {}) {
  return {
    action: 'push-exam-results',
    user_id: user?.user_id ?? null,
    exam_id: exam?.exam_id ?? null,
    attempt_id: exam?.attempt_id ?? null,
    exam_type: exam?.exam_type ?? null,
    final_grade: exam?.final_grade ?? null,
    passed: exam?.passed ?? null,
  };
}

module.exports = {
  buildDirectoryPolicyPayload,
  buildDirectoryResultPayload,
};


