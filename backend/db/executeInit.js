const fs = require('fs');
const path = require('path');

// Prefer NEW connection if provided; fall back to default (do not change anything else)
const connectionString = process.env.SUPABASE_NEW_DB_URL || process.env.SUPABASE_DB_URL;
if (connectionString) {
  process.env.SUPABASE_DB_URL = connectionString;
}
// Log which variable is used (heuristic: pooler URL implies new Supabase)
try {
  const marker = connectionString
    ? (connectionString.includes('pooler') ? 'NEW SUPABASE' : 'OLD SUPABASE')
    : 'UNSET';
  // eslint-disable-next-line no-console
  console.log('INIT CONNECTION:', marker);
} catch (_) {
  // no-op
}

const pool = require('../config/supabaseDB');

async function executeInitSql() {
  const sqlPath = path.join(__dirname, 'init.sql');
  if (!fs.existsSync(sqlPath)) {
    console.warn('⚠️ init.sql not found at', sqlPath);
    return;
  }

  const raw = fs.readFileSync(sqlPath, 'utf8');
  // Split on semicolons, naive but sufficient for current script content
  const statements = raw
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    const sql = stmt + ';';
    try {
      // eslint-disable-next-line no-console
      console.log('EXECUTING:', sql.substring(0, 80), '...');
      await pool.query(sql);
    } catch (err) {
      // Ignore duplicate object errors for CREATE TYPE or TABLE if they already exist
      const code = err && err.code;
      if (code === '42710' || code === '42P07') {
        console.log('ℹ️ Skipping duplicate object:', (sql.split('\n')[0] || '').slice(0, 120));
        continue;
      }
      console.error('❌ Error executing statement:', sql, '\n→', err?.message || err);
      throw err;
    }
  }
  // eslint-disable-next-line no-console
  console.log('SCHEMA INIT COMPLETED');
}

module.exports = { executeInitSql };

// Allow direct execution: `node backend/db/executeInit.js`
if (require.main === module) {
  executeInitSql()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

