const pool = require('../config/supabaseDB');
const { ProctoringSession } = require('../models');

exports.startCamera = async (req, res, next) => {
  try {
    const { attempt_id } = req.params || {};
    if (!attempt_id) {
      return res.status(400).json({ error: 'attempt_id_required' });
    }

    // Load exam_id from Postgres for the given attempt
    const { rows } = await pool.query(
      `SELECT ea.attempt_id, ea.exam_id FROM exam_attempts ea WHERE ea.attempt_id = $1`,
      [attempt_id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'attempt_not_found' });
    }
    const examId = rows[0].exam_id;

    await ProctoringSession.findOneAndUpdate(
      { attempt_id: String(attempt_id) },
      {
        attempt_id: String(attempt_id),
        exam_id: String(examId),
        camera_status: 'active',
        $setOnInsert: { start_time: new Date(), events: [] },
      },
      { new: true, upsert: true },
    );

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};


