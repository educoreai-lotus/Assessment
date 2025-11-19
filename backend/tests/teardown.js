const mongoose = require('mongoose');
const pool = require('../config/supabaseDB');

module.exports = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Mongo teardown error:", err.message);
  }

  try {
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Postgres teardown error:", err.message);
  }

  try {
    if (typeof jest !== 'undefined' && jest.useRealTimers) {
      jest.useRealTimers();
    }
  } catch {}
};


