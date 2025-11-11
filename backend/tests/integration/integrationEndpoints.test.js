const request = require('supertest');
const app = require('../../server');

describe('Unified integration endpoints', () => {
  test('POST /api/assessment/integration with skills_engine', async () => {
    const res = await request(app)
      .post('/api/assessment/integration')
      .send({ api_caller: 'skills_engine', stringified_json: JSON.stringify({ user_id: 'u_1' }) });
    expect(res.status).toBe(202);
    expect(res.body.flow).toBe('baseline_exam_start');
  });

  test('POST /api/assessment/integration with course_builder start exam', async () => {
    const res = await request(app)
      .post('/api/assessment/integration')
      .send({ api_caller: 'course_builder', stringified_json: JSON.stringify({}) });
    expect(res.status).toBe(202);
    expect(res.body.flow).toBe('postcourse_exam_start');
  });

  test('POST /api/assessment/integration with course_builder extra attempt', async () => {
    const res = await request(app)
      .post('/api/assessment/integration')
      .send({ api_caller: 'course_builder', stringified_json: JSON.stringify({ update_type: 'extra_attempt' }) });
    expect(res.status).toBe(202);
    expect(res.body.flow).toBe('grant_extra_attempt');
  });

  test('POST /api/assessment/integration with devlab coding', async () => {
    const res = await request(app)
      .post('/api/assessment/integration')
      .send({ api_caller: 'devlab', stringified_json: JSON.stringify({ questions: [{ qid: 'q1' }] }) });
    expect(res.status).toBe(202);
    expect(res.body.flow).toBe('devlab_coding_questions_ingest');
  });

  test('POST /api/assessment/integration with devlab theoretical', async () => {
    const res = await request(app)
      .post('/api/assessment/integration')
      .send({ api_caller: 'devlab', stringified_json: JSON.stringify({ difficulty: 'hard' }) });
    expect(res.status).toBe(202);
    expect(res.body.flow).toBe('devlab_theoretical_request');
  });

  test('POST /api/assessment/integration with rag', async () => {
    const res = await request(app)
      .post('/api/assessment/integration')
      .send({ api_caller: 'rag', stringified_json: JSON.stringify({}) });
    expect(res.status).toBe(202);
    expect(res.body.flow).toBe('rag_incident_report');
  });

  test('POST /api/assessment/integration with protocol_camera', async () => {
    const res = await request(app)
      .post('/api/assessment/integration')
      .send({ api_caller: 'protocol_camera', stringified_json: JSON.stringify({}) });
    expect(res.status).toBe(202);
    expect(res.body.flow).toBe('protocol_camera_event');
  });

  test('POST /api/assessment/integration with missing api_caller returns 400', async () => {
    const res = await request(app).post('/api/assessment/integration').send({});
    expect(res.status).toBe(400);
  });

  test('GET /api/assessment/integration for learning_analytics', async () => {
    const res = await request(app)
      .get('/api/assessment/integration')
      .query({ api_caller: 'learning_analytics', stringified_json: JSON.stringify({ attempt_id: 'att_1' }) });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user_id');
    expect(res.body).toHaveProperty('skills');
  });

  test('GET /api/assessment/integration for management', async () => {
    const res = await request(app)
      .get('/api/assessment/integration')
      .query({ api_caller: 'management', stringified_json: JSON.stringify({ attempt_id: 'att_1' }) });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user_id');
    expect(res.body).toHaveProperty('final_grade');
  });

  test('GET /api/assessment/integration invalid caller returns 400', async () => {
    const res = await request(app).get('/api/assessment/integration').query({ api_caller: 'unknown' });
    expect(res.status).toBe(400);
  });
});


