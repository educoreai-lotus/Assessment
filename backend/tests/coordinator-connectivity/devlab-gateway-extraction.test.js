const gateway = require('../../services/gateways/devlabGateway');
jest.mock('../../services/integrations/envelopeSender', () => ({
  sendToCoordinator: jest.fn(),
}));
const { sendToCoordinator } = require('../../services/integrations/envelopeSender');

describe('DevLab gateway extraction resilience', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('Case 1: response.answer is string with questions', async () => {
    const answerObj = { success: true, questions: [{ id: 'q1' }], componentHtml: '<div>ok</div>' };
    sendToCoordinator.mockResolvedValue({ data: { response: { answer: JSON.stringify(answerObj) } } });
    const ret = await gateway.requestCodingWidgetHtml({ attempt_id: 1, skills: ['s1'] });
    expect(Array.isArray(ret.questions)).toBe(true);
    expect(ret.questions.length).toBe(1);
    expect(typeof ret.html).toBe('string');
  });

  test('Case 2: response.answer is object with questions', async () => {
    sendToCoordinator.mockResolvedValue({ data: { response: { answer: { success: true, questions: [{ id: 'q2' }] } } } });
    const ret = await gateway.requestCodingWidgetHtml({ attempt_id: 2, skills: ['s2'] });
    expect(Array.isArray(ret.questions)).toBe(true);
    expect(ret.questions.length).toBe(1);
  });

  test('Case 3: questions at json.data.questions', async () => {
    sendToCoordinator.mockResolvedValue({ data: { data: { questions: [{ id: 'q3a' }, { id: 'q3b' }] } } });
    const ret = await gateway.requestCodingWidgetHtml({ attempt_id: 3, skills: ['s3'] });
    expect(Array.isArray(ret.questions)).toBe(true);
    expect(ret.questions.length).toBe(2);
  });
});


