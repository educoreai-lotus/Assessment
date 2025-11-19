const { selectFailedSkillIds } = require('../../services/core/retakeUtils');

describe('retakeUtils.selectFailedSkillIds', () => {
  test('returns only non-acquired or below passing grade skills', () => {
    const attemptSkills = [
      { skill_id: 's_a', status: 'acquired', score: 80 },
      { skill_id: 's_b', status: 'failed', score: 50 },
      { skill_id: 's_c', status: 'acquired', score: 60 },
      { skill_id: 's_d', status: 'pending', score: 90 },
    ];
    const pg = 70;
    const out = selectFailedSkillIds(attemptSkills, pg);
    expect(Array.from(out)).toEqual(expect.arrayContaining(['s_b', 's_c', 's_d']));
    expect(out.has('s_a')).toBe(false);
  });
});


