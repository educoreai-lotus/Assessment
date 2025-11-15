const pool = require('../config/supabaseDB');
const { ProctoringSession, ProctoringViolation } = require('../models');

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

exports.reportFocusViolation = async (req, res, next) => {
  try {
    const { attempt_id } = req.params || {};
    if (!attempt_id) {
      return res.status(400).json({ error: 'attempt_id_required' });
    }

    // Load or create violation document
    const doc =
      (await ProctoringViolation.findOne({ attempt_id: String(attempt_id) })) ||
      (await ProctoringViolation.create({
        attempt_id: String(attempt_id),
        count: 0,
        events: [],
      }));

    // Increment count and append focus event
    doc.count = Number(doc.count || 0) + 1;
    doc.events.push({ type: 'focus_lost', timestamp: new Date() });

    // If threshold reached, cancel attempt in Postgres and add exam_canceled event
    if (doc.count >= 3) {
      // Ensure status column exists; tolerate errors silently
      try {
        await pool.query(
          `ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS status VARCHAR(20)`
        );
      } catch {}

      await pool.query(
        `UPDATE exam_attempts SET status = 'canceled' WHERE attempt_id = $1`,
        [attempt_id],
      );
      doc.events.push({ type: 'exam_canceled', timestamp: new Date() });
      await doc.save();
      return res.json({ cancelled: true });
    }

    await doc.save();
    return res.json({ warning: doc.count });
  } catch (err) {
    return next(err);
  }
};


