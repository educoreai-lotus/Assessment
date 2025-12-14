jest.mock('../../services/gateways/devlabGateway', () => ({
  requestCodingQuestions: jest.fn(async ({ amount, skills }) => {
    const a = Number(amount || 1);
    // Return questions with mixed difficulties; service should override to "medium"
    const diffs = ['easy', 'hard', 'expert', 'medium'];
    return Array.from({ length: a }).map((_, i) => ({
      question: `Code Q${i + 1}`,
      programming_language: 'javascript',
      expected_output: '',
      test_cases: [],
      difficulty: diffs[i % diffs.length],
      skill_id: (skills && skills[0]) || 's_js',
    }));
  }),
}));

const devlabService = require('../../services/integrations/devlabService');

describe('EXAM MODE – coding difficulty policy', () => {
  test('coding action forces all difficulties to "medium"', async () => {
    const resp = await devlabService.handleInbound(
      { action: 'coding', skills: ['s_js'], amount: 4, difficulty: 'hard' },
      { requester_service: 'assessment-service' }
    );
    expect(Array.isArray(resp)).toBe(true);
    expect(resp.length).toBe(4);
    for (const q of resp) {
      expect(q.difficulty).toBe('medium');
    }
  });
});


