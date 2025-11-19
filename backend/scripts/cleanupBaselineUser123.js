/* Safe cleanup script for baseline attempts for user_id=123.
 * Uses parameterized queries and a transaction.
 */

const pool = require('../config/supabaseDB');

async function main() {
  const client = await pool.connect();
  const USER_ID = 123;
  const EXAM_TYPE = 'baseline';
  const TEST_ATTEMPT_ID = 5; // confirm select

  try {
    await client.query('BEGIN');

    const delAttempts = await client.query(
      `DELETE FROM exam_attempts
       WHERE exam_id IN (
         SELECT exam_id FROM exams WHERE exam_type = $1 AND user_id = $2
       )`,
      [EXAM_TYPE, USER_ID],
    );

    const delExams = await client.query(
      `DELETE FROM exams WHERE exam_type = $1 AND user_id = $2`,
      [EXAM_TYPE, USER_ID],
    );

    const selAttempt = await client.query(
      `SELECT * FROM exam_attempts WHERE attempt_id = $1`,
      [TEST_ATTEMPT_ID],
    );

    const selExams = await client.query(
      `SELECT * FROM exams WHERE user_id = $1 AND exam_type = $2`,
      [USER_ID, EXAM_TYPE],
    );

    await client.query('COMMIT');

    const result = {
      deleted_attempts_count: delAttempts.rowCount || 0,
      deleted_exams_count: delExams.rowCount || 0,
      confirm_attempt_id_5: selAttempt.rows || [],
      confirm_exams_user_123_baseline: selExams.rows || [],
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    // eslint-disable-next-line no-console
    console.error('[cleanupBaselineUser123][ERROR]', err && err.message ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

main();


