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

module.exports = {
  buildSkillsEngineFetchBaselinePayload,
  buildSkillsEngineResultPayload,
};


