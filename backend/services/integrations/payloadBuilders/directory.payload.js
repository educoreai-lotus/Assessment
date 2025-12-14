function buildDirectoryPolicyPayload({ exam_type, user_id, course_id } = {}) {
  return {
    action: 'fetch-policy',
    exam_type: exam_type ?? null,
    user_id: user_id ?? null,
    course_id: course_id ?? null,
  };
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


