jest.mock('../../services/gateways/aiGateway', () => ({
  generateDevLabTheoreticalQuestions: jest.fn(async ({ amount, skills }) => {
    // Cycle difficulty: easy → medium → hard → repeat
    const cycle = ['easy', 'medium', 'hard'];
    const a = Number(amount || 1);
    return Array.from({ length: a }).map((_, i) => ({
      id: `q_${i + 1}`,
      type: i % 2 === 0 ? 'mcq' : 'open',
      stem: `Question for ${(skills && skills[0]) || 's1'}`,
      skill_id: (skills && skills[0]) || 's1',
      difficulty: cycle[i % cycle.length],
      options: i % 2 === 0 ? ['A', 'B', 'C', 'D'] : undefined,
      correct_answer: i % 2 === 0 ? 'A' : '',
      explanation: 'ok',
      hints: ['h1', 'h2', 'h3'],
    }));
  }),
}));

const devlabService = require('../../services/integrations/devlabService');

describe('DevLab INTERNAL MODE – theoretical generation difficulty spread', () => {
  test('amount=1 includes a non-medium difficulty (easy)', async () => {
    const resp = await devlabService.handleInbound({ action: 'generate-questions', skills: ['s1'], amount: 1 }, { requester_service: 'devlab' });
    const diffs = (resp.questions || []).map(q => q.difficulty);
    expect(diffs.length).toBe(1);
    expect(['easy', 'medium', 'hard']).toContain(diffs[0]);
    expect(diffs[0]).not.toBe(''); // normalized
  });

  test('amount=2 includes at least easy and medium (spread)', async () => {
    const resp = await devlabService.handleInbound({ action: 'generate-questions', skills: ['s1'], amount: 2 }, { requester_service: 'devlab' });
    const diffs = (resp.questions || []).map(q => q.difficulty);
    expect(diffs).toEqual(expect.arrayContaining(['easy', 'medium']));
  });

  test('amount=3 includes easy, medium, hard (spread)', async () => {
    const resp = await devlabService.handleInbound({ action: 'generate-questions', skills: ['s1'], amount: 3 }, { requester_service: 'devlab' });
    const diffs = (resp.questions || []).map(q => q.difficulty);
    expect(diffs).toEqual(expect.arrayContaining(['easy', 'medium', 'hard']));
  });
});


