const request = require('supertest');
const app = require('../../server');

describe('Universal integration endpoint', () => {
  test('POST /api/fill-content-metrics with skillsengine (unified envelope)', async () => {
    const res = await request(app)
      .post('/api/fill-content-metrics')
      .send({
        service_requester: 'SkillsEngine',
        payload: { stringified_json: JSON.stringify({ user_id: 'u_1' }) },
        response: {}
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('service_requester', 'Assessment');
    expect(res.body).toHaveProperty('payload');
  });

  test('POST /api/fill-content-metrics with coursebuilder (unified envelope)', async () => {
    const res = await request(app)
      .post('/api/fill-content-metrics')
      .send({
        service_requester: 'CourseBuilder',
        payload: { stringified_json: JSON.stringify({}) },
        response: {}
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('service_requester', 'Assessment');
  });

  test('POST /api/fill-content-metrics with devlab (unified envelope)', async () => {
    const res = await request(app)
      .post('/api/fill-content-metrics')
      .send({
        service_requester: 'DevLab',
        payload: {
          action: 'theoretical',
          topic_id: 1,
          topic_name: 'Arrays',
          amount: 3,
          difficulty: 'in ascending order of difficulty',
          humanLanguage: 'en',
          skills: ['s_js_async', 's_js_promises']
        },
        response: { answer: [] }
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('service_requester', 'Assessment');
    expect(res.body).toHaveProperty('response');
  });

  test('POST /api/fill-content-metrics with missing fields returns 400', async () => {
    const res = await request(app).post('/api/fill-content-metrics').send({});
    expect(res.status).toBe(400);
  });
});
