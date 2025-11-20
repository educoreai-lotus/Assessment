const pool = require('../config/supabaseDB');

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userIdNumeric = 123;
    const { rows } = await client.query(
      `
        SELECT ea.attempt_id, ea.exam_id
        FROM exam_attempts ea
        JOIN exams e ON e.exam_id = ea.exam_id
        WHERE e.user_id = $1
          AND e.exam_type = 'postcourse'
      `,
      [userIdNumeric],
    );
    const attemptIds = Array.from(new Set(rows.map(r => r.attempt_id))).filter(Boolean);
    const examIds = Array.from(new Set(rows.map(r => r.exam_id))).filter(Boolean);

    if (attemptIds.length > 0) {
      await client.query(`DELETE FROM attempt_skills WHERE attempt_id = ANY($1::int[])`, [attemptIds]);
      await client.query(`DELETE FROM exam_attempts WHERE attempt_id = ANY($1::int[])`, [attemptIds]);
    }
    if (examIds.length > 0) {
      await client.query(`DELETE FROM exams WHERE exam_id = ANY($1::int[])`, [examIds]);
    }

    await client.query('COMMIT');
    console.log(
      'RESET_POSTCOURSE_OK',
      JSON.stringify({ userIdNumeric, attempts: attemptIds.length, exams: examIds.length }),
    );
    process.exit(0);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('RESET_POSTCOURSE_ERR', e?.message || e);
    process.exit(1);
  } finally {
    client.release();
  }
})();


