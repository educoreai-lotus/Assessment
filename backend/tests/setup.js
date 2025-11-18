const { Pool } = require('pg');
require('dotenv').config();

module.exports = async () => {
  const connectionString =
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_POOLER_URL ||
    process.env.DATABASE_URL;

  // If no live Postgres is configured, skip setup (tests will be skipped too)
  if (!connectionString) {
    return;
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Ensure the fixed test user exists for FK references in exams.user_id
    await pool.query(
      `
        INSERT INTO users (user_id, name, email)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `,
      [300, 'Test User', 'test@example.com'],
    );
  } finally {
    await pool.end().catch(() => {});
  }
};


