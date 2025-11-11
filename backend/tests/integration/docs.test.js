const request = require('supertest');
const app = require('../../server');

describe('Swagger docs', () => {
  it('serves /docs UI', async () => {
    const res = await request(app).get('/docs');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(400);
  });
});


