const {
  buildCourseBuilderCoveragePayload,
  buildCourseBuilderResultPayload,
} = require('../../../services/integrations/payloadBuilders/courseBuilder.payload');

describe('payloadBuilders/courseBuilder', () => {
  test('coverage payload includes action and params', () => {
    const out = buildCourseBuilderCoveragePayload({ learner_id: 'u_1' });
    expect(out).toHaveProperty('action', 'fetch-coverage-map');
    expect(out).toHaveProperty('learner_id', 'u_1');
  });

  test('result payload maps learner/course/exam fields', () => {
    const out = buildCourseBuilderResultPayload({
      learner: { learner_id: 'u_1', learner_name: 'Jane' },
      course: { course_id: 'c_1', course_name: 'JS' },
      exam: { exam_id: 10, attempt_id: 20, exam_type: 'postcourse' },
    });
    expect(out).toMatchObject({
      action: 'postcourse-exam-result',
      learner_id: 'u_1',
      learner_name: 'Jane',
      course_id: 'c_1',
      course_name: 'JS',
      exam_id: 10,
      attempt_id: 20,
      exam_type: 'postcourse',
    });
  });
});


