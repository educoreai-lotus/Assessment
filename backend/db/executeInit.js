const fs = require('fs');
const path = require('path');
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
      await pool.query(sql);
      // eslint-disable-next-line no-console
      console.log('✅ Executed:', sql.split('\n')[0].slice(0, 120));
    } catch (err) {
      // Ignore duplicate object errors for CREATE TYPE if enum already exists
      const code = err && err.code;
      if (code === '42710') {
        console.log('ℹ️ Skipping duplicate object (likely CREATE TYPE):', sql.split('\n')[0].slice(0, 120));
        continue;
      }
      console.error('❌ Error executing statement:', sql, '\n→', err?.message || err);
      throw err;
    }
  }
}

module.exports = { executeInitSql };


