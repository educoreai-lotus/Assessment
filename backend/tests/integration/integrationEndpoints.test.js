const request = require('supertest');
const app = require('../../server');

describe('Universal integration endpoint', () => {
  test('POST /api/fill-content-metrics with skillsengine (unified envelope)', async () => {
    const res = await request(app)
      .post('/api/fill-content-metrics')
      .send({
        requester_service: 'skills-engine',
        payload: {
          action: 'fill-content-metrics',
          user_id: 'u_1',
        },
        response: {}
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
  });

  test('POST /api/fill-content-metrics with coursebuilder (unified envelope)', async () => {
    const res = await request(app)
      .post('/api/fill-content-metrics')
      .send({
        requester_service: 'course-builder',
        payload: {
          action: 'start-postcourse-exam',
          learner_id: 'u_123',
          learner_name: 'Test User',
          course_id: 'c_456',
          course_name: 'Demo Course'
        },
        response: {}
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
  });

  test('POST /api/fill-content-metrics with devlab (unified envelope)', async () => {
    const res = await request(app)
      .post('/api/fill-content-metrics')
      .send({
        requester_service: 'devlab',
        payload: {
          action: 'fill-content-metrics',
          topic_id: 1,
          topic_name: 'Arrays',
          amount: 3,
          difficulty: 'in ascending order of difficulty',
          humanLanguage: 'en',
          skills: ['s_js_async', 's_js_promises']
        },
        response: {}
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('response');
  });

  test('POST /api/fill-content-metrics with missing fields returns 400', async () => {
    const res = await request(app).post('/api/fill-content-metrics').send({});
    expect(res.status).toBe(400);
  });
});
