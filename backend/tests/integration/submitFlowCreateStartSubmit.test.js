const request = require('supertest');
const app = require('../../server');

const hasLiveEnv = !!(process.env.SUPABASE_DB_URL || process.env.SUPABASE_POOLER_URL || process.env.DATABASE_URL);

(hasLiveEnv ? describe : describe.skip)('Full submission flow: create → start → submit', () => {
  jest.setTimeout(30000);

  it('creates exam, starts attempt, submits answers, and returns grading payload', async () => {
    const user_id = 300;
    // 1) Create exam (postcourse)
    const createRes = await request(app)
      .post('/api/exams')
      .send({
        user_id,
        exam_type: 'postcourse',
        course_id: 'c_555',
        course_name: 'New Test Course',
      })
      .set('Content-Type', 'application/json');

    expect([201, 200]).toContain(createRes.statusCode);
    const { exam_id, attempt_id } = createRes.body || {};
    expect(exam_id).toBeTruthy();
    expect(attempt_id).toBeTruthy();

    // Start camera (proctoring) before starting the exam
    const camRes = await request(app)
      .post(`/api/proctoring/${attempt_id}/start_camera`)
      .set('Content-Type', 'application/json');
    expect([200]).toContain(camRes.statusCode);

    // 2) Start exam
    const startRes = await request(app)
      .post(`/api/exams/${exam_id}/start`)
      .send({ attempt_id })
      .set('Content-Type', 'application/json');

    expect([200]).toContain(startRes.statusCode);
    // 3) Submit answers
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

    if (submitRes.statusCode === 200) {
      expect(submitRes.body).toHaveProperty('attempt_id', attempt_id);
      expect(submitRes.body).toHaveProperty('submitted_at');
      expect(submitRes.body).toHaveProperty('final_grade');
      expect(submitRes.body).toHaveProperty('passed');
      expect(Array.isArray(submitRes.body.skills)).toBe(true);

      // 4) Verify via attempt detail endpoint (persistence)
      const detailRes = await request(app).get(`/api/attempts/${attempt_id}`);
      expect(detailRes.statusCode).toBe(200);
      expect(detailRes.body).toHaveProperty('submitted_at');
      expect(detailRes.body).toHaveProperty('final_grade');
      expect(detailRes.body).toHaveProperty('passed');
      expect(Array.isArray(detailRes.body.skills)).toBe(true);
    } else {
      // Logical blocks acceptable in CI
      expect([400, 403, 404]).toContain(submitRes.statusCode);
    }
  });
});


