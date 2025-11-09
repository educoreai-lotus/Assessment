const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pool = require('./config/supabaseDB');

const PORT = process.env.PORT || 4000;
const API_BASE = '/api/v1';

const app = express();

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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'assessment-platform-backend',
    time: new Date().toISOString(),
  });
});

app.get('/health/postgres', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ ok: true, now: result.rows[0].now });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ ok: false, error: 'Postgres not reachable' });
  }
});

app.use(`${API_BASE}`, (req, res) => {
  res.status(501).json({
    status: 'pending',
    message: 'Core API implementation removed during Phase 07 cleanup. Rebuild required.',
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(JSON.stringify({ level: 'error', message: err.message }));
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
