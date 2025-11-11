const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(() => console.log('✅ Connected to Supabase PostgreSQL'))
  .catch((err) => console.error('❌ Supabase connection error:', err));

module.exports = pool;


