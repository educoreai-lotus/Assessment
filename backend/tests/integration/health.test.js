const request = require('supertest');

jest.mock('../../config/supabaseDB', () => {
  return {
    query: jest.fn(async (sql, params) => {
      const text = typeof sql === 'string' ? sql : sql.text || '';
      if (text.includes('SELECT NOW() AS now')) {
        return { rows: [{ now: '2025-11-11T00:00:00Z' }] };
      }
      if (text.includes('FROM information_schema.tables')) {
        return {
          rows: [
            { table_name: 'users' },
            { table_name: 'exams' },
            { table_name: 'exam_attempts' },
            { table_name: 'attempt_skills' },
            { table_name: 'outbox_integrations' },
          ],
        };
      }
      if (text.includes("WHERE typname = 'exam_type'")) {
        return { rows: [{ has_type: true }] };
      }
      if (text.includes('FROM pg_enum')) {
        return { rows: [{ enumlabel: 'baseline' }, { enumlabel: 'postcourse' }] };
      }
      return { rows: [] };
    }),
  };
});

jest.mock('mongoose', () => {
  const collections = ['exam_packages', 'ai_audit_trail', 'proctoring_events', 'incidents'];
  const db = {
    admin: () => ({ ping: async () => ({ ok: 1 }) }),
    listCollections: () => ({
      toArray: async () => collections.map((name) => ({ name })),
    }),
  };
  return {
    connection: {
      readyState: 1,
      db,
    },
  };
});

const app = require('../../server');

describe('Health routes', () => {
  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /health/postgres should validate tables and enum', async () => {
    const res = await request(app).get('/health/postgres');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.missingTables).toEqual([]);
    expect(res.body.examTypeValues).toEqual(['baseline', 'postcourse']);
  });

  it('GET /health/mongo should validate collections and state', async () => {
    const res = await request(app).get('/health/mongo');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.missingCollections).toEqual([]);
  });
});


