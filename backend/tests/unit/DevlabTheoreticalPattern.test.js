jest.mock('../../services/gateways/aiGateway', () => ({
  generateTheoreticalQuestions: jest.fn(async ({ items }) => {
    return items.map((it, i) => ({
      qid: `q_${i + 1}`,
      type: i % 2 === 0 ? 'mcq' : 'open',
      stem: `Question for ${it.skill_id}`,
      skill_id: it.skill_id,
      difficulty: it.difficulty,
      options: i % 2 === 0 ? ['A', 'B', 'C', 'D'] : undefined,
      correct_answer: i % 2 === 0 ? 'A' : '',
      explanation: 'ok',
      hint: 'safe hint',
    }));
  }),
  validateQuestion: jest.fn(async () => ({ valid: true, reasons: [] })),
}));

const devlabService = require('../../services/integrations/devlabService');

describe('DevLab theoretical generation difficulty pattern', () => {
  test('1 -> medium', async () => {
    const resp = await devlabService.handleInbound({ action: 'generateTheoretical', skill_id: 's1', num_questions: 1 }, {});
    const diffs = resp.questions.map(q => q.difficulty);
    expect(diffs).toEqual(['medium']);
  });
  test('2 -> easy, medium', async () => {
    const resp = await devlabService.handleInbound({ action: 'generateTheoretical', skill_id: 's1', num_questions: 2 }, {});
    const diffs = resp.questions.map(q => q.difficulty);
    expect(diffs).toEqual(['easy', 'medium']);
  });
  test('3 -> easy, medium, hard', async () => {
    const resp = await devlabService.handleInbound({ action: 'generateTheoretical', skill_id: 's1', num_questions: 3 }, {});
    const diffs = resp.questions.map(q => q.difficulty);
    expect(diffs).toEqual(['easy', 'medium', 'hard']);
  });
  test('5 -> easy, medium, medium, medium, hard', async () => {
    const resp = await devlabService.handleInbound({ action: 'generateTheoretical', skill_id: 's1', num_questions: 5 }, {});
    const diffs = resp.questions.map(q => q.difficulty);
    expect(diffs).toEqual(['easy', 'medium', 'medium', 'medium', 'hard']);
  });
});


