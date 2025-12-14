const {
  buildSkillsEngineFetchBaselinePayload,
  buildSkillsEngineResultPayload,
} = require('../../../services/integrations/payloadBuilders/skillsEngine.payload');

describe('payloadBuilders/skillsEngine', () => {
  test('buildSkillsEngineFetchBaselinePayload adds action and merges params', () => {
    const out = buildSkillsEngineFetchBaselinePayload({ user_id: 'u_1' });
    expect(out).toHaveProperty('action', 'fetch-baseline-skills');
    expect(out).toHaveProperty('user_id', 'u_1');
  });

  test('buildSkillsEngineResultPayload shapes baseline results', () => {
    const out = buildSkillsEngineResultPayload({
      user: { user_id: 'u_1' },
      exam: { exam_type: 'baseline', exam_id: 10, attempt_id: 20 },
      skills: [{ skill_id: 's1', score: 80 }],
    });
    expect(out).toMatchObject({
      action: 'baseline-exam-result',
      user_id: 'u_1',
      exam_type: 'baseline',
      exam_id: 10,
      attempt_id: 20,
    });
    expect(Array.isArray(out.skills)).toBe(true);
  });
});


