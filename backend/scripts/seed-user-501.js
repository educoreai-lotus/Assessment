const pool = require('../config/supabaseDB');

(async () => {
  try {
    await pool.query(
      'INSERT INTO users (user_id, name, email) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING',
      [501, 'Test User 501', 'test501@example.com'],
    );
    console.log('USER_OK');
  } catch (e) {
    console.error('USER_ERR', e?.message || e);
    process.exit(1);
  }
  process.exit(0);
})();


