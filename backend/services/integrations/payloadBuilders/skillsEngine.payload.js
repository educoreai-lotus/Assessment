function buildSkillsEngineFetchBaselinePayload(params = {}) {
  return {
    action: 'fetch-baseline-skills',
    ...params,
  };
}

function buildSkillsEngineResultPayload({ user, exam, skills, coverage } = {}) {
  return {
    action: 'baseline-exam-result',
    user_id: user?.user_id ?? user?.id ?? null,
    exam_type: exam?.exam_type ?? 'baseline',
    exam_id: exam?.exam_id ?? null,
    attempt_id: exam?.attempt_id ?? null,
    skills: Array.isArray(skills) ? skills : [],
    coverage_map: Array.isArray(coverage) ? coverage : undefined,
  };
}

function buildBaselineExamResultPayload({ user_id, exam_id, final_grade, passed, skills, passing_grade = 70 } = {}) {
  return {
    action: 'baseline-exam-result',
    user_id,
    exam_type: 'baseline',
    exam_id,
    passing_grade: Number(passing_grade),
    final_grade: Number(final_grade || 0),
    passed: !!passed,
    skills: Array.isArray(skills) ? skills : [],
  };
}

function buildPostCourseExamResultPayload({ user_id, exam_id, course_name, final_grade, passed, skills, passing_grade = 70 } = {}) {
  return {
    action: 'postcourse-exam-result',
    user_id,
    exam_type: 'postcourse',
    exam_id,
    course_name: course_name || null,
    passing_grade: Number(passing_grade),
    final_grade: Number(final_grade || 0),
    passed: !!passed,
    final_status: 'completed',
    skills: Array.isArray(skills) ? skills : [],
  };
}

module.exports = {
  buildSkillsEngineFetchBaselinePayload,
  buildSkillsEngineResultPayload,
  buildBaselineExamResultPayload,
  buildPostCourseExamResultPayload,
};


