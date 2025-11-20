const request = require('supertest');
const app = require('../../server');

const hasLiveEnv = !!(process.env.SUPABASE_DB_URL || process.env.SUPABASE_POOLER_URL || process.env.DATABASE_URL);

(hasLiveEnv ? describe : describe.skip)('Proctoring gating enforcement', () => {
  jest.setTimeout(30000);

  it('blocks starting exam if camera not started (expects 403)', async () => {
    // Arrange: create a new exam/attempt
    const user_id = 300;
    const createRes = await request(app)
      .post('/api/exams')
      .send({
        user_id,
        exam_type: 'postcourse',
        course_id: 'c_777',
        course_name: 'Gating Test Course',
      })
      .set('Content-Type', 'application/json');
    expect([201, 200, 400, 403]).toContain(createRes.statusCode);
    if ([400, 403].includes(createRes.statusCode)) {
      const err = createRes.body?.error || '';
      const isRetakeBlocked = err === 'retake_not_allowed' || err === 'baseline_already_exists';
      if (isRetakeBlocked) {
        // Acceptable: retake disallowed; nothing to start
        return;
      }
    }
    const { exam_id, attempt_id } = createRes.body || {};
    expect(exam_id).toBeTruthy();
    expect(attempt_id).toBeTruthy();

    // Act: try to start the exam WITHOUT starting camera
    const startRes = await request(app)
      .post(`/api/exams/${exam_id}/start`)
      .send({ attempt_id })
      .set('Content-Type', 'application/json');

    // Assert
    expect(startRes.statusCode).toBe(403);
    expect(startRes.body).toHaveProperty('error', 'proctoring_not_started');
  });

  it('blocks submitting exam if camera not started (expects 403)', async () => {
    // Arrange: create a new exam/attempt
    const user_id = 300;
    const createRes = await request(app)
      .post('/api/exams')
      .send({
        user_id,
        exam_type: 'postcourse',
        course_id: 'c_778',
        course_name: 'Gating Submit Course',
      })
      .set('Content-Type', 'application/json');
    expect([201, 200, 400, 403]).toContain(createRes.statusCode);
    if ([400, 403].includes(createRes.statusCode)) {
      const err = createRes.body?.error || '';
      const isRetakeBlocked = err === 'retake_not_allowed' || err === 'baseline_already_exists';
      if (isRetakeBlocked) {
        // Acceptable: retake disallowed; nothing to submit
        return;
      }
    }
    const { exam_id, attempt_id } = createRes.body || {};
    expect(exam_id).toBeTruthy();
    expect(attempt_id).toBeTruthy();

    // Act: attempt to submit WITHOUT camera
    const submitRes = await request(app)
      .post(`/api/exams/${exam_id}/submit`)
      .send({
        attempt_id,
        answers: [
          {
            question_id: 'devlab_q42',
            type: 'code',
            skill_id: 's_js_async',
            answer: 'async function test(){ return true; }',
          },
          {
            question_id: 'q_event_loop',
            type: 'mcq',
            skill_id: 's_js_promises',
            answer: 'Microtasks run before rendering and before next macrotask.',
          },
        ],
      })
      .set('Content-Type', 'application/json');

    // Assert
    expect(submitRes.statusCode).toBe(403);
    expect(submitRes.body).toHaveProperty('error', 'proctoring_not_started');
  });
});


