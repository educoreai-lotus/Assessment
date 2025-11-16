const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.SUPABASE_DB_URL;
const source = 'SUPABASE_DB_URL';

if (!connectionString) {
  // eslint-disable-next-line no-console
  console.error('❌ Missing SUPABASE_DB_URL');
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



