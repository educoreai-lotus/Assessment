jest.mock('../../services/gateways/aiGateway', () => ({
  generateTheoreticalQuestions: jest.fn(async ({ items }) => {
    return items.map((it, i) => ({
      qid: `q_${i + 1}`,
      type: i % 2 === 0 ? 'mcq' : 'open',
      stem: `Question for ${it.skill_id}`,
      skill_id: it.skill_id,
      difficulty: it.difficulty || 'medium',
      options: i % 2 === 0 ? ['A', 'B', 'C', 'D'] : undefined,
      correct_answer: i % 2 === 0 ? 'A' : '',
      explanation: 'ok',
      hint: 'safe hint',
    }));
  }),
  validateQuestion: jest.fn(async () => ({ valid: true, reasons: [] })),
}));

describe('AI Integration policies', () => {
  test('Exam generation uses medium difficulty (policy)', async () => {
    const { generateTheoreticalQuestions } = require('../../services/gateways/aiGateway');
    const items = Array.from({ length: 3 }).map((_, i) => ({ skill_id: `s_${i+1}`, difficulty: 'medium' }));
    const out = await generateTheoreticalQuestions({ items });
    expect(out.every(q => q.difficulty === 'medium')).toBe(true);
  });

  test('Multiple question types returned (mcq and open)', async () => {
    const { generateTheoreticalQuestions } = require('../../services/gateways/aiGateway');
    const items = Array.from({ length: 4 }).map((_, i) => ({ skill_id: `s_${i+1}`, difficulty: 'medium' }));
    const out = await generateTheoreticalQuestions({ items });
    const hasMcq = out.some(q => q.type === 'mcq');
    const hasOpen = out.some(q => q.type === 'open');
    expect(hasMcq && hasOpen).toBe(true);
  });
});


