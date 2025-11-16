const { createExam, markAttemptStarted, getPackageByExamId, submitAttempt } = require('../services/core/examsService');
const pool = require('../config/supabaseDB');
const { ProctoringSession, ExamPackage } = require('../models');

exports.createExam = async (req, res, next) => {
  try {
    const { user_id, exam_type, course_id, course_name } = req.body || {};
    if (!user_id || !exam_type) {
      return res.status(400).json({ error: 'user_id_and_exam_type_required' });
    }
    const resp = await createExam({ user_id, exam_type, course_id, course_name });
    if (resp && resp.error) {
      return res.status(400).json(resp);
    }
    return res.status(201).json(resp);
  } catch (err) {
    return next(err);
  }
};

exports.startExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { attempt_id } = req.body || {};
    if (!attempt_id) {
      return res.status(400).json({ error: 'attempt_id_required' });
    }

    // Block if attempt time expired
    const { rows: expRows } = await pool.query(
      `SELECT expires_at, duration_minutes, status FROM exam_attempts WHERE attempt_id = $1`,
      [attempt_id],
    ).catch(() => ({ rows: [] }));
    const expAt = expRows?.[0]?.expires_at ? new Date(expRows[0].expires_at) : null;
    if (expAt && new Date() > expAt) {
      return res.status(403).json({ error: 'exam_time_expired' });
    }

    // Block if attempt was canceled
    const { rows: statusRows } = await pool.query(
      `SELECT status FROM exam_attempts WHERE attempt_id = $1`,
      [attempt_id],
    ).catch(() => ({ rows: [] }));
    const statusVal = statusRows?.[0]?.status || null;
    if (statusVal === 'canceled') {
      return res.status(403).json({ error: 'attempt_canceled' });
    }

    // Enforce camera activation prior to starting
   // const session = await ProctoringSession.findOne({ attempt_id: String(attempt_id) }).lean();
   // if (!session || session.camera_status !== 'active') {
   //   return res.status(403).json({ error: 'camera_inactive', camera_required: true });
   // }

    const result = await markAttemptStarted({ attempt_id });
    if (result && result.error) {
      return res.status(400).json(result);
    }

    // Set ExamPackage.metadata.start_time = now (do not overwrite if already set)
    try {
      await ExamPackage.updateOne(
        { attempt_id: String(attempt_id) },
        { $setOnInsert: {}, $set: { 'metadata.start_time': new Date().toISOString() } },
        { upsert: false }
      );
    } catch {}

    const pkg = await getPackageByExamId(examId);
    if (!pkg) {
      return res.status(404).json({ error: 'package_not_found' });
    }
    const removeHintsDeep = (input) => {
      if (input == null) return input;
      if (Array.isArray(input)) return input.map((i) => removeHintsDeep(i));
      if (typeof input === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(input)) {
          if (k === 'hints') continue;
          out[k] = removeHintsDeep(v);
        }
        return out;
      }
      return input;
    };
    return res.json({
      exam_id: Number(pkg.exam_id),
      attempt_id: Number(pkg.attempt_id),
      exam_type: pkg?.metadata?.exam_type || null,
      user_id: pkg?.user?.user_id || null,
      course_id: pkg?.metadata?.course_id || null,
      policy: pkg?.metadata?.policy || {},
      skills: pkg?.metadata?.skills || [],
      coverage_map: pkg?.coverage_map || [],
      questions: pkg?.questions?.map((q) => removeHintsDeep(q.prompt)) || [],
      time_allocated_minutes: pkg?.metadata?.time_allocated_minutes ?? null,
      expires_at: pkg?.metadata?.expires_at ?? null,
      camera_required: true,
    });
  } catch (err) {
    return next(err);
  }
};

exports.submitExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { attempt_id, answers } = req.body || {};

    if (!attempt_id || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'attempt_id_and_answers_required' });
    }

    // Validate attempt exists and matches examId; check status and expiration
    const attemptIdNum = Number(attempt_id);
    // [submitExam-controller] diagnostic logs
    // eslint-disable-next-line no-console
    console.debug('[submitExam-controller] params', {
      examId: Number(examId),
      attempt_id_raw: attempt_id,
      attempt_id_num: attemptIdNum,
    });
    const { rows: attemptRows } = await pool
      .query(
        `SELECT ea.attempt_id, ea.exam_id, ea.status, ea.expires_at
         FROM exam_attempts ea
         WHERE ea.attempt_id = $1`,
        [attemptIdNum],
      )
      .catch(() => ({ rows: [] }));

    // eslint-disable-next-line no-console
    console.debug('[submitExam-controller] attempt select result', {
      length: attemptRows?.length || 0,
      row0: attemptRows?.[0] || null,
    });

    if (!attemptRows || attemptRows.length === 0) {
      return res.status(404).json({ error: 'attempt_not_found' });
    }

    const att = attemptRows[0];
    if (Number(att.exam_id) !== Number(examId)) {
      return res.status(400).json({ error: 'exam_mismatch' });
    }

    if (att.status === 'canceled') {
      return res.status(403).json({ error: 'attempt_canceled' });
    }

    if (att.expires_at) {
      const now = new Date();
      const exp = new Date(att.expires_at);
      if (now > exp) {
        return res.status(403).json({ error: 'exam_time_expired' });
      }
    }

    // Ensure camera is still active
    //const session = await ProctoringSession.findOne({ attempt_id: String(attempt_id) }).lean();
    //if (!session || session.camera_status !== 'active') {
     // return res.status(403).json({ error: 'camera_inactive', camera_required: true });
    //}

    const response = await submitAttempt({ attempt_id: attemptIdNum, answers });

    if (response && response.error) {
      // Map known service errors to 4xx
      if (response.error === 'exam_time_expired' || response.error === 'attempt_canceled') {
        return res.status(403).json(response);
      }
      if (response.error === 'attempt_not_found') {
        return res.status(404).json(response);
      }
      return res.status(400).json(response);
    }

    return res.json(response);
  } catch (err) {
    return next(err);
  }
};


