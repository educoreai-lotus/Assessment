const { Pool } = require('pg');
require('dotenv').config();

function resolvePostgresConnectionString() {
  const candidates = [
    process.env.SUPABASE_DB_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
    process.env.SUPABASE_URL, // some envs mistakenly set API URL; reject if no 'postgres' scheme
  ].filter(Boolean);

  const firstValid = candidates.find((val) => /^postgres(ql)?:\/\//i.test(val));
  if (firstValid) return firstValid;

  console.warn('⚠️ No valid Postgres connection string found in SUPABASE_DB_URL, POSTGRES_URL, or DATABASE_URL');
  return undefined;
}

const connectionString = resolvePostgresConnectionString();

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

function maskConnectionInfo(cs) {
  try {
    if (!cs) return '(no-connection-string)';
    const url = new URL(cs);
    const host = url.hostname;
    const db = (url.pathname || '').replace(/^\//, '');
    return `host=${host} db=${db}`;
  } catch {
    return '(unparseable-connection-string)';
  }
}

pool.connect()
  .then(() => console.log(`✅ Connected to PostgreSQL (${maskConnectionInfo(connectionString)})`))
  .catch((err) => console.error('❌ PostgreSQL connection error:', err?.message || err));

module.exports = pool;



