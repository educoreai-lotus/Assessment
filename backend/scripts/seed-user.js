const pool = require('../config/supabaseDB');

async function seedUser(userId, name, email) {
  await pool.query(
    'INSERT INTO users (user_id, name, email) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING',
    [userId, name, email],
  );
}

(async () => {
  try {
    const [id, nm, em] = process.argv.slice(2);
    const uid = Number(id);
    if (!Number.isFinite(uid)) throw new Error('userId must be a number');
    await seedUser(uid, nm || `Test User ${uid}`, em || `test${uid}@example.com`);
    console.log(`USER_${uid}_OK`);
  } catch (e) {
    console.error('USER_SEED_ERR', e?.message || e);
    process.exit(1);
  }
  process.exit(0);
})();


