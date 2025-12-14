const {
  buildDevLabCodingRequestPayload,
  buildDevLabGradePayload,
} = require('../../../services/integrations/payloadBuilders/devlab.payload');

describe('payloadBuilders/devlab', () => {
  test('coding request includes action and fields', () => {
    const out = buildDevLabCodingRequestPayload({ amount: 2, skills: ['s1'], humanLanguage: 'en', difficulty: 'medium' });
    expect(out).toMatchObject({
      action: 'coding',
      amount: 2,
      humanLanguage: 'en',
      difficulty: 'medium',
    });
    expect(Array.isArray(out.skills)).toBe(true);
  });

  test('grade payload includes answers and optional questions', () => {
    const out = buildDevLabGradePayload({ attempt: { attempt_id: 7 }, answers: [{ q: 1, a: 'x' }] });
    expect(out).toMatchObject({
      action: 'grade-coding',
      attempt_id: 7,
    });
    expect(Array.isArray(out.answers)).toBe(true);
  });
});


