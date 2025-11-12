const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const pool = require('./config/supabaseDB');
const { runBootstrapMigrations } = require('./db/migrations');
const connectMongo = require('./config/mongoDB');
const models = require('./models');
const integrationRoutes = require('./routes/integration');
const { mountSwagger } = require('./swagger');

const PORT = process.env.PORT || 4000;
const API_BASE = '/api/v1';

const app = express();

connectMongo();
// Run lightweight migrations that are safe to execute on startup
runBootstrapMigrations(pool).catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Migration error:', e?.message || e);
});

app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = [
  'https://assessment-tests.vercel.app',
  'http://localhost:5173',
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '50kb' }));

// Swagger docs
mountSwagger(app);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'assessment-platform-backend',
    time: new Date().toISOString(),
  });
});

app.get('/health/postgres', async (req, res) => {
  try {
    const {
      rows: [{ now }],
    } = await pool.query('SELECT NOW() AS now');

    const expectedTables = [
      'users',
      'exams',
      'exam_attempts',
      'attempt_skills',
      'outbox_integrations',
    ];

    const { rows: tableRows } = await pool.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
      `,
      [expectedTables]
    );

    const missingTables = expectedTables.filter(
      (tableName) => !tableRows.find((row) => row.table_name === tableName)
    );

    const {
      rows: [{ has_type: hasExamType }],
    } = await pool.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'exam_type'
        ) AS has_type
      `
    );

    const { rows: enumRows } = await pool.query(
      `
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = 'exam_type'::regtype
      `
    );

    const examTypeValues = enumRows.map(({ enumlabel }) => enumlabel).sort();
    const expectedEnumValues = ['baseline', 'postcourse'];
    const missingEnumValues = expectedEnumValues.filter(
      (value) => !examTypeValues.includes(value)
    );

    res.json({
      ok:
        missingTables.length === 0 &&
        hasExamType &&
        missingEnumValues.length === 0,
      now,
      hasExamType,
      missingTables,
      examTypeValues,
      missingEnumValues,
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ ok: false, error: 'Postgres not reachable' });
  }
});

app.get('/health/mongo', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;

    if (state !== 1) {
      return res.status(503).json({
        ok: false,
        state,
        message:
          state === 2
            ? 'MongoDB connecting'
            : state === 0
              ? 'MongoDB disconnected'
              : 'MongoDB disconnecting',
      });
    }

    const admin = mongoose.connection.db.admin();
    const ping = await admin.ping();

    // List collections in a safe, non-regex way and compute count
    const collections = await mongoose.connection.db.listCollections().toArray();
    const existingCollections = collections.map((c) => c.name);

    res.json({
      ok: true,
      state,
      registeredModels: Object.keys(models),
      ping,
      collections: existingCollections.length,
      observedCollections: existingCollections,
    });
  } catch (error) {
    console.error('Mongo health check error:', error);
    res.status(500).json({ ok: false, error: 'MongoDB health check failed' });
  }
});

// Mount integration endpoints EXACTLY as per integration map (no version prefix)
app.use('/', integrationRoutes);

// Keep versioned base for future non-integration routes
app.use(`${API_BASE}`, (req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(JSON.stringify({ level: 'error', message: err.message }));
  res.status(500).json({ error: 'server_error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;


