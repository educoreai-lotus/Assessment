const { Pool } = require('pg');
require('dotenv').config();

const connectionString =
  process.env.SUPABASE_POOLER_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL;

const source =
  process.env.SUPABASE_POOLER_URL ? 'SUPABASE_POOLER_URL' :
  process.env.SUPABASE_DB_URL ? 'SUPABASE_DB_URL' :
  process.env.DATABASE_URL ? 'DATABASE_URL' : null;

if (!connectionString) {
  // eslint-disable-next-line no-console
  console.error('❌ Missing SUPABASE connection string (SUPABASE_POOLER_URL | SUPABASE_DB_URL | DATABASE_URL)');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

function maskConnectionInfo(cs) {
  try {
    const url = new URL(cs);
    const host = url.hostname;
    const db = (url.pathname || '').replace(/^\//, '');
    return `host=${host} db=${db}`;
  } catch {
    return '(unparseable-connection-string)';
  }
}

pool.connect()
  .then(() => console.log(`✅ Connected to PostgreSQL via ${source} (${maskConnectionInfo(connectionString)})`))
  .catch((err) => console.error('❌ PostgreSQL connection error:', err?.message || err));

module.exports = pool;



