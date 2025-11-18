const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.SUPABASE_DB_URL;
const source = 'SUPABASE_DB_URL';

let pool;
if (!connectionString) {
  if (process.env.NODE_ENV === 'test') {
    // Provide a lightweight stub pool in test mode when DB URL is not set,
    // so requiring the server does not exit the process.
    // eslint-disable-next-line no-console
    console.warn('⚠️ SUPABASE_DB_URL not set; using stub pool for tests');
    pool = {
      query: async () => {
        throw new Error('No Postgres configured in test environment');
      },
      end: async () => {},
      connect: async () => {},
    };
  } else {
    // eslint-disable-next-line no-console
    console.error('❌ Missing SUPABASE_DB_URL');
    process.exit(1);
  }
} else {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

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
if (process.env.NODE_ENV !== 'test' && connectionString) {
  // eslint-disable-next-line no-console
  console.log("ENV PGHOST:", process.env.PGHOST);
  pool.connect()
    // eslint-disable-next-line no-console
    .then(() => console.log(`✅ Connected to PostgreSQL via ${source} (${maskConnectionInfo(connectionString)})`))
    // eslint-disable-next-line no-console
    .catch((err) => console.error('❌ PostgreSQL connection error:', err?.message || err));
}



module.exports = pool;



