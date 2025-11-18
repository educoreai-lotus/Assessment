const request = require('supertest');
const app = require('../../server');

describe('Universal integration endpoint', () => {
  test('POST /api/fill-content-metrics with skillsengine', async () => {
    const res = await request(app)
      .post('/api/fill-content-metrics')
      .send({ requester_service: 'skillsengine', stringified_json: JSON.stringify({ user_id: 'u_1' }) });
    expect([200, 202]).toContain(res.status);
    expect(res.body).toHaveProperty('requester_service', 'skillsengine');
    expect(res.body).toHaveProperty('stringified_json');
  });

  test('POST /api/fill-content-metrics with coursebuilder', async () => {
    const res = await request(app)
      .post('/api/fill-content-metrics')
      .send({ requester_service: 'coursebuilder', stringified_json: JSON.stringify({}) });
    expect([200, 202]).toContain(res.status);
    expect(res.body).toHaveProperty('requester_service', 'coursebuilder');
  });

  test('POST /api/fill-content-metrics with devlab', async () => {
    const res = await request(app)
      .post('/api/fill-content-metrics')
      .send({ requester_service: 'devlab', stringified_json: JSON.stringify({ questions: [{ qid: 'q1' }] }) });
    expect([200, 202]).toContain(res.status);
    expect(res.body).toHaveProperty('requester_service', 'devlab');
  });

  test('POST /api/fill-content-metrics with missing fields returns 400', async () => {
    const res = await request(app).post('/api/fill-content-metrics').send({});
    expect(res.status).toBe(400);
  });
});
