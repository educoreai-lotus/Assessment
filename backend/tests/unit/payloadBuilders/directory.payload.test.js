const {
  buildDirectoryPolicyPayload,
  buildDirectoryResultPayload,
} = require('../../../services/integrations/payloadBuilders/directory.payload');

describe('payloadBuilders/directory', () => {
  test('policy payload has action and fields', () => {
    const out = buildDirectoryPolicyPayload({ exam_type: 'baseline', user_id: 'u_1', course_id: 'c_1' });
    expect(out).toMatchObject({ action: 'fetch-policy', exam_type: 'baseline', user_id: 'u_1', course_id: 'c_1' });
  });

  test('result payload maps user and exam', () => {
    const out = buildDirectoryResultPayload({
      user: { user_id: 'u_1' },
      exam: { exam_id: 10, attempt_id: 20, exam_type: 'baseline', final_grade: 85, passed: true },
    });
    expect(out).toMatchObject({
      action: 'push-exam-results',
      user_id: 'u_1',
      exam_id: 10,
      attempt_id: 20,
      exam_type: 'baseline',
      final_grade: 85,
      passed: true,
    });
  });
});


