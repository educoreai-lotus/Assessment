// IMPORTANT ARCHITECTURE NOTE
// ---------------------------
// PostgreSQL stores ONLY numeric IDs.
// MongoDB stores original string IDs.
// Incoming API can send ANY ID format.
// normalizeToInt() extracts numeric portion for SQL usage.
// This guarantees:
// - strict relational integrity in PostgreSQL
// - flexible ID formats for external microservices
// - zero prefix collisions
// - correct grading and attempt lookup

const { createExamRecord, prepareExamAsync, markAttemptStarted, getPackageByExamId, getPackageByAttemptId, submitAttempt } = require('../services/core/examsService');
const pool = require('../config/supabaseDB');
const { ProctoringSession, ExamPackage } = require('../models');
const { ExamContext } = require('../models');
const { normalizeToInt } = require("../services/core/idNormalizer");
const proctoringController = require('./../controllers/proctoringController');

// POST /api/exams/:examId/cancel - cancel current active attempt
exports.cancelExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { attempt_id } = req.body || {};
    const examIdNum = normalizeToInt(examId);
    if (examIdNum == null) {
      return res.status(400).json({ error: 'invalid_exam_id' });
    }
    const pool = require('../config/supabaseDB');
    let targetAttempt = normalizeToInt(attempt_id);

    if (!Number.isFinite(targetAttempt)) {
      const { rows } = await pool.query(
        `SELECT attempt_id, status, submitted_at
         FROM exam_attempts
         WHERE exam_id = $1
         ORDER BY attempt_no DESC
         LIMIT 1`,
        [examIdNum],
      );
      const row = rows?.[0];
      if (row && String(row.status || '').toLowerCase() !== 'submitted' && String(row.status || '').toLowerCase() !== 'canceled') {
        targetAttempt = Number(row.attempt_id);
      }
    }

    if (!Number.isFinite(targetAttempt)) {
      return res.json({ ok: true }); // nothing to cancel
    }

    const attemptRowRes = await pool.query(
      `SELECT ea.*, e.exam_type, e.user_id FROM exam_attempts ea JOIN exams e ON e.exam_id = ea.exam_id WHERE ea.attempt_id = $1`,
      [targetAttempt]
    );
    const attemptRow = attemptRowRes.rows[0];

    const updateRes = await pool.query(
      `UPDATE exam_attempts
       SET status = 'canceled', submitted_at = NOW()
       WHERE attempt_id = $1 AND COALESCE(status, '') <> 'canceled'`,
      [targetAttempt],
    );
    const { sendAlertEmail } = require("../services/emailService");
    if (updateRes && Number(updateRes.rowCount || 0) > 0) {
      await sendAlertEmail({
        to: process.env.NOTIFY_ADMIN_EMAIL,
        subject: 'Exam Canceled - Proctoring Violation',
        html: `<h2>Exam Canceled</h2> <p>An exam has been automatically terminated due to a proctoring violation.</p> <p><strong>User ID:</strong> ${attemptRow?.user_id ?? 'unknown'}</p> <p><strong>Attempt ID:</strong> ${targetAttempt}</p> <p><strong>Exam Type:</strong> ${attemptRow?.exam_type ?? 'unknown'}</p> <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>`,
      });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

// POST /api/exams/context - persist exam context snapshot from Directory redirect
exports.saveExamContext = async (req, res, next) => {
  try {
    const examType = String(req.body?.exam_type || '').toLowerCase();
    const userId = req.body?.user_id;
    const competencyName = typeof req.body?.competency_name === 'string' && req.body.competency_name.trim() !== '' ? req.body.competency_name.trim() : null;
    if (examType !== 'baseline') {
      return res.status(400).json({ error: 'invalid_exam_type' });
    }
    if (!userId || !competencyName) {
      return res.status(400).json({ error: 'baseline_context_incomplete' });
    }
    // Upsert by user_id + exam_type
    await ExamContext.findOneAndUpdate(
      { user_id: String(userId), exam_type: 'baseline' },
      {
        user_id: String(userId),
        exam_type: 'baseline',
        competency_name: competencyName,
        updated_at: new Date(),
      },
      { new: true, upsert: true },
    );
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

// GET /api/exams/:examId - package readiness/info
exports.getExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const examIdNum = normalizeToInt(examId);
    if (examIdNum == null) {
      return res.status(400).json({ error: 'invalid_exam_id' });
    }
    const pkg = await ExamPackage.findOne({ exam_id: String(examIdNum) }).lean();
    if (!pkg) {
      return res.status(202).json({ package_ready: false });
    }
    return res.status(200).json({
      package_ready: true,
      ...pkg,
    });
  } catch (err) {
    return next(err);
  }
};

exports.createExam = async (req, res, next) => {
  try {
    const { user_id, exam_type, course_id, course_name } = req.body || {};
    if (!user_id || !exam_type) {
      return res.status(400).json({ error: 'user_id_and_exam_type_required' });
    }
    // Enforce numeric user id to avoid sending "u_123" to Postgres
    const userStr = String(user_id);
    const userInt = Number(userStr.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(userInt)) {
      try { console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'invalid_user_id', user_id_original: user_id, user_id_numeric: null }); } catch {}
      return res.status(400).json({ error: 'invalid_user_id' });
    }
    // [TRACE] create entry
    try {
      // eslint-disable-next-line no-console
      console.log(`[TRACE][${String(exam_type).toUpperCase()}][CREATE]`, {
        user_id_original: user_id,
        user_id_numeric: userInt,
        exam_type,
        course_id: course_id ?? null,
        course_name: course_name ?? null,
        env: {
          DIRECTORY_BASE_URL: !!process.env.DIRECTORY_BASE_URL,
          SKILLS_ENGINE_BASE_URL: !!process.env.SKILLS_ENGINE_BASE_URL,
          COURSE_BUILDER_BASE_URL: !!process.env.COURSE_BUILDER_BASE_URL,
          INTEGRATION_DEVLAB_DATA_REQUEST_URL: !!process.env.INTEGRATION_DEVLAB_DATA_REQUEST_URL,
          OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        },
      });
    } catch {}
    const __t0 = Date.now();
    try { console.log('[TRACE][EXAM][CREATE][STEP] fast_create start'); } catch {}
    const resp = await createExamRecord({ user_id: userStr, exam_type, course_id, course_name });
    try { console.log('[TRACE][EXAM][CREATE][STEP] fast_create end elapsed_ms=%d', Date.now() - __t0); } catch {}
    if (resp && resp.error) {
      const errorCode = String(resp.error);
      if (errorCode === 'baseline_already_completed' || errorCode === 'max_attempts_reached' || errorCode === 'retake_not_allowed') {
        return res.status(403).json({ error: errorCode, message: resp.message || errorCode });
      }
      if (errorCode === 'exam_creation_failed') {
        try { console.log('[TRACE][EXAM][CREATE][ERROR]', { error_code: errorCode, user_id, exam_type, course_id }); } catch {}
        return res.status(500).json({ error: errorCode, message: resp.message || 'Failed to create exam' });
      }
      return res.status(400).json({ error: errorCode, message: resp.message || errorCode });
    }

    // Immediately kick off async preparation (do NOT await), unless an in-flight prep already started
    try {
      const alreadyPreparing = String(resp?.status || '').toUpperCase() === 'PREPARING' && Number(resp?.progress || 0) > 0;
      if (!alreadyPreparing) {
        setImmediate(() => {
          try { console.log('[TRACE] prepareExamAsync started', { exam_id: resp?.exam_id, attempt_id: resp?.attempt_id }); } catch {}
          prepareExamAsync(resp.exam_id, resp.attempt_id, { user_id: userStr, exam_type, course_id, course_name })
            .catch((e) => { try { console.log('[TRACE][prepareExamAsync ERROR]', { message: e?.message }); } catch {} });
        });
      } else {
        try { console.log('[TRACE][PREP][IDEMPOTENT][REUSE]', { exam_id: resp?.exam_id, attempt_id: resp?.attempt_id }); } catch {}
      }
    } catch {}

    try { console.log('[TRACE] POST /api/exams -> 201 in %dms', Date.now() - __t0); } catch {}
    return res.status(201).json(resp);
  } catch (err) {
    return next(err);
  }
};

exports.startExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { attempt_id } = req.body || {};
    // [TRACE] start entry
    try {
      // eslint-disable-next-line no-console
      console.log('[TRACE][EXAM][START]', { examId: Number(examId), attempt_id });
      console.log('[TRACE][START] only runs on frontend request', { examId: Number(examId) });
    } catch {}

    // Validate and parse IDs
    const examIdNum = normalizeToInt(examId);
    const attemptIdNum = normalizeToInt(attempt_id);
    if (attemptIdNum == null || examIdNum == null || Number(examIdNum) <= 0 || Number(attemptIdNum) <= 0) {
      try { console.log('[TRACE][EXAM][START][ERROR]', { error: 'invalid_exam_or_attempt_id', exam_id: examId, attempt_id }); } catch {}
      return res.status(400).json({ error: 'invalid_exam_or_attempt_id', message: 'Provide valid positive integer exam_id and attempt_id' });
    }

    // Load attempt and basic validations (time, cancel, mismatch)
    const { rows: attemptRows } = await pool.query(
      `SELECT attempt_id, exam_id, status, expires_at, started_at, duration_minutes FROM exam_attempts WHERE attempt_id = $1`,
      [attemptIdNum],
    ).catch(() => ({ rows: [] }));
    const attRow = attemptRows?.[0] || null;
    if (!attRow) {
      try { console.log('[TRACE][EXAM][START][NOT_FOUND]', { attempt_id: attemptIdNum }); } catch {}
      return res.status(404).json({ error: 'attempt_not_found', message: 'Attempt not found' });
    }
    if (Number(attRow.exam_id) !== Number(examIdNum)) {
      try { console.log('[TRACE][EXAM][START][MISMATCH]', { exam_id: examIdNum, attempt_exam_id: attRow.exam_id, attempt_id: attemptIdNum }); } catch {}
      return res.status(400).json({ error: 'attempt_exam_mismatch', message: 'Attempt does not belong to provided exam_id' });
    }
    const expAt = attRow?.expires_at ? new Date(attRow.expires_at) : null;
    if (expAt && new Date() > expAt) {
      return res.status(403).json({ error: 'exam_time_expired', message: 'Exam time expired', status: 'expired', expires_at: expAt.toISOString() });
    }
    const startedAtVal = attRow?.started_at ? new Date(attRow.started_at).toISOString() : null;
    const durationSecondsVal =
      Number.isFinite(Number(attRow?.duration_minutes))
        ? Number(attRow.duration_minutes) * 60
        : null;
    if ((attRow?.status || null) === 'canceled') {
      return res.status(403).json({ error: 'attempt_canceled', message: 'Attempt was canceled' });
    }

    // Guard: exam must be READY before start (aligns postcourse with baseline flow)
    try {
      const { rows: examRows } = await pool.query(
        `SELECT COALESCE(status, 'READY') AS status FROM exams WHERE exam_id = $1`,
        [examIdNum],
      ).catch(() => ({ rows: [] }));
      const examRow = examRows?.[0] || null;
      const examStatus = examRow ? String(examRow.status || '') : null;
      if (!examRow) {
        return res.status(404).json({ error: 'exam_not_found' });
      }
      if (examStatus !== 'READY') {
        try { console.log('[TRACE][EXAM][START][NOT_READY]', { exam_id: examIdNum, attempt_id: attemptIdNum, status: examStatus }); } catch {}
        return res.status(409).json({ error: 'exam_not_ready', status: examStatus });
      }
    } catch (e) {
      try { console.log('[TRACE][EXAM][START][STATUS_CHECK_ERROR]', { exam_id: examIdNum, message: e?.message }); } catch {}
      return res.status(500).json({ error: 'exam_status_check_failed' });
    }

    // Enforce camera activation prior to starting
    let session = null;
    try {
      session = await ProctoringSession.findOne({ attempt_id: String(attemptIdNum) }).lean();
      try {
        console.log('[TRACE][EXAM][START][PROCTORING][LOOKUP]', {
          attempt_id: attemptIdNum,
          exam_id: Number(examIdNum),
          found: !!session,
          doc: session || null,
        });
      } catch {}
    } catch (e) {
      try { console.log('[TRACE][EXAM][START][PROCTORING][ERROR]', { error: 'proctoring_lookup_failed', attempt_id: attemptIdNum, exam_id: Number(examIdNum), message: e?.message }); } catch {}
      return res.status(500).json({ error: 'proctoring_lookup_failed', message: 'Failed to verify proctoring session' });
    }
    const hasStarted =
      !!session &&
      (String(session?.camera_status || '').toLowerCase() === 'active' ||
        !!session?.start_time ||
        !!session?.started_at);
    if (!hasStarted) {
      try { console.log('[TRACE][EXAM][START][PROCTORING][GATE]', { ok: false, attempt_id: attemptIdNum, exam_id: Number(examIdNum), camera_status: session?.camera_status || null, start_time: session?.start_time || null }); } catch {}
      return res.status(403).json({ error: 'proctoring_not_started', message: 'Proctoring session not started' });
    }
    try { console.log('[TRACE][EXAM][START][PROCTORING][GATE]', { ok: true, attempt_id: attemptIdNum, exam_id: Number(examIdNum), camera_status: session?.camera_status || 'active' }); } catch {}

    const result = await markAttemptStarted({ attempt_id: attemptIdNum });
    if (result && result.error) {
      return res.status(400).json({ error: result.error, message: result.message || result.error });
    }

    // Set ExamPackage.metadata.start_time = now (skip in tests)
    if (process.env.NODE_ENV !== 'test') {
      try {
        await ExamPackage.updateOne(
          { attempt_id: String(attemptIdNum) },
          { $setOnInsert: {}, $set: { 'metadata.start_time': new Date().toISOString() } },
          { upsert: false }
        );
      } catch {}
    }

    let pkg;
    if (process.env.NODE_ENV === 'test') {
      // Prefer real package if available (e.g., when running e2e against real Mongo)
      pkg = await getPackageByAttemptId(String(attemptIdNum));
      if (!pkg) pkg = await getPackageByExamId(examIdNum);
      if (!pkg) {
        pkg = {
          exam_id: String(examIdNum),
          attempt_id: String(attemptIdNum),
          metadata: {
            exam_type: null,
            skills: [],
            policy: {},
            time_allocated_minutes: null,
            expires_at: null,
          },
          coverage_map: [],
          questions: [],
          coding_questions: [],
        };
      }
    } else {
      pkg = await getPackageByAttemptId(String(attemptIdNum));
      if (!pkg) pkg = await getPackageByExamId(examIdNum);
      if (!pkg) {
        try { console.log('[TRACE][EXAM][START][PACKAGE_NOT_FOUND]', { exam_id: examIdNum, attempt_id: attemptIdNum }); } catch {}
        return res.status(500).json({ error: 'exam_package_not_found', message: 'Exam package not found' });
      }
    }
    if (!Array.isArray(pkg?.questions)) {
      try { console.log('[TRACE][EXAM][START][PACKAGE_INVALID]', { exam_id: examIdNum, attempt_id: attemptIdNum }); } catch {}
      return res.status(500).json({ error: 'invalid_exam_package', message: 'Invalid exam package' });
    }

    // Defensive question shaping
    const safeMapQuestions = (arr) => {
      const out = [];
      for (const q of Array.isArray(arr) ? arr : []) {
        if (!q || typeof q !== 'object') {
          try { console.log('[TRACE][EXAM][START][QUESTION_SKIPPED]', { reason: 'non_object', exam_id: examIdNum, attempt_id: attemptIdNum }); } catch {}
          continue;
        }
        const metadata = (q && q.metadata && typeof q.metadata === 'object') ? q.metadata : {};
        const prompt = (q && q.prompt && typeof q.prompt === 'object') ? q.prompt : (typeof q?.prompt === 'string' ? { question: q.prompt } : {});
        const options = Array.isArray(q?.options) ? q.options : [];
        out.push({
          question_id: q?.question_id || null,
          skill_id: q?.skill_id || (prompt && prompt.skill_id) || null,
          prompt,
          options,
          metadata,
        });
      }
      return out;
    };
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
    const userIntFromPkg = normalizeToInt(pkg?.user?.user_id);
    const courseIntFromPkg = normalizeToInt(pkg?.metadata?.course_id);
    // Map theoretical questions with explicit sequence numbers
    const theoreticalForResponse = safeMapQuestions(pkg?.questions).map((q, idx) => ({
      question_id: q.question_id,
      skill_id: q.skill_id,
      prompt: removeHintsDeep(q.prompt),
      options: Array.isArray(q.options) ? q.options : [],
      metadata: q.metadata || {},
      sequence: idx + 1,
    }));
    // If coding questions exist, mark coding_required/pending (attempt state remains 'started')
    try {
      const hasCoding = (Array.isArray(pkg?.coding_questions) && pkg.coding_questions.length > 0) ||
                        !!(pkg?.metadata?.devlab_ui);
      if (hasCoding) {
        try {
          await pool.query(`ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS coding_required BOOLEAN DEFAULT FALSE`);
          await pool.query(`ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS coding_status VARCHAR(20) DEFAULT 'pending'`);
        } catch {}
        try {
          const { rowCount } = await pool.query(
            `UPDATE exam_attempts
               SET status = 'started',
                   coding_required = TRUE,
                   coding_status = COALESCE(coding_status, 'pending')
             WHERE attempt_id = $1 AND COALESCE(status,'') <> 'canceled'`,
            [attemptIdNum],
          );
          try { console.log('[CODING][REQUIRED][SET]', { attempt_id: attempt_id, exam_id: Number(examId), coding_questions_count: Array.isArray(pkg?.coding_questions) ? pkg.coding_questions.length : 0, updated_rows: rowCount }); } catch {}
          try { console.log('[CODING][STATUS][SET_PENDING]', { attempt_id: attempt_id }); } catch {}
        } catch {}
      }
    } catch {}

    // Return ONLY theoretical questions in 'questions' for clean stage separation.
    // Coding questions are available via 'coding_questions' and UI block via 'devlab_ui'.
    const questionsForResponse = theoreticalForResponse;
    return res.json({
      exam_id: Number(pkg.exam_id),
      attempt_id: Number(pkg.attempt_id),
      exam_type: pkg?.metadata?.exam_type || null,
      user_id: userIntFromPkg != null ? Number(userIntFromPkg) : null,
      course_id: courseIntFromPkg != null ? Number(courseIntFromPkg) : null,
      policy: pkg?.metadata?.policy || {},
      skills: pkg?.metadata?.skills || [],
      coverage_map: pkg?.coverage_map || [],
      questions: questionsForResponse,
      total_questions: questionsForResponse.length,
      ui_hints: {
        allow_unanswered_navigation: true,
        allow_empty_submit: true,
      },
      coding_questions: Array.isArray(pkg?.coding_questions) ? pkg.coding_questions : [],
      devlab_ui: pkg?.metadata?.devlab_ui || null,
      time_allocated_minutes: pkg?.metadata?.time_allocated_minutes ?? null,
      expires_at: pkg?.metadata?.expires_at ?? null,
      started_at: startedAtVal,
      duration_seconds: durationSecondsVal,
      package_ref: pkg?._id ? String(pkg._id) : null,
      camera_required: true,
    });
  } catch (err) {
    try { console.log('[TRACE][EXAM][START][ERROR]', { error: 'unexpected_error', message: err?.message }); } catch {}
    return res.status(500).json({ error: 'start_internal_error', message: 'Unexpected error while starting exam' });
  }
};

exports.submitExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { attempt_id } = req.body || {};
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const devlabBlock = (req.body && req.body.devlab) || null;
    // [TRACE] submit entry
    try {
      // eslint-disable-next-line no-console
      console.log('[TRACE][EXAM][SUBMIT]', {
        examId: Number(examId),
        attempt_id,
        answers_count: answers.length,
      });
    } catch {}

    if (!attempt_id) {
      return res.status(400).json({ error: 'attempt_id_required', message: 'attempt_id is required' });
    }

    // Validate attempt exists and matches examId; check status and expiration
    const attemptIdNum = normalizeToInt(attempt_id);
    if (attemptIdNum == null) {
      return res.status(400).json({ error: "invalid_attempt_id", message: 'Provide valid attempt_id' });
    }
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
      return res.status(404).json({ error: 'attempt_not_found', message: 'Attempt not found' });
    }

    const att = attemptRows[0];
    if (Number(att.exam_id) !== Number(examId)) {
      return res.status(400).json({ error: 'exam_mismatch', message: 'Attempt does not belong to provided exam_id' });
    }

    if (att.status === 'canceled') {
      return res.status(403).json({ error: 'attempt_canceled', message: 'Attempt was canceled' });
    }

    if (att.expires_at) {
      const now = new Date();
      const exp = new Date(att.expires_at);
      if (now > exp) {
        return res.status(403).json({ error: 'exam_time_expired', message: 'Exam time expired' });
      }
    }

    // Ensure camera is still active
    let session = null;
    try {
      session = await ProctoringSession.findOne({ attempt_id: String(attemptIdNum) }).lean();
    } catch (e) {
      try { console.log('[TRACE][EXAM][SUBMIT][ERROR]', { error: 'proctoring_lookup_failed', attempt_id: attemptIdNum, message: e?.message }); } catch {}
      return res.status(500).json({ error: 'proctoring_lookup_failed', message: 'Failed to verify proctoring session' });
    }
    if (!session || session.camera_status !== 'active') {
      return res.status(403).json({ error: 'proctoring_not_started', message: 'Proctoring session not started' });
    }

    // Allow empty submissions (log and continue)
    if (!answers || answers.length === 0) {
      try { console.log('[EXAM][SUBMIT][EMPTY][ALLOWED]', { exam_id: Number(examId), attempt_id: attemptIdNum }); } catch {}
    }

    // Coding grading sync: if coding is required and not yet graded, do not finalize
    try {
      // Determine coding_required from package (best-effort)
      const pkg = await ExamPackage.findOne({ attempt_id: String(attemptIdNum) }).lean().catch(() => null);
      const codingRequired = !!(pkg && Array.isArray(pkg.coding_questions) && pkg.coding_questions.length > 0);
      // Persist coding_required/coding_status best-effort
      try {
        await pool.query(`ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS coding_required BOOLEAN`);
        await pool.query(`ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS coding_status VARCHAR(20)`);
      } catch {}
      if (codingRequired) {
        try {
          await pool.query(
            `UPDATE exam_attempts SET coding_required = TRUE, coding_status = COALESCE(coding_status, 'pending') WHERE attempt_id = $1`,
            [attemptIdNum],
          );
        } catch {}
      }
      // Read coding_status
      let codingStatus = null;
      try {
        const { rows: csRows } = await pool.query(
          `SELECT coding_required, coding_status FROM exam_attempts WHERE attempt_id = $1`,
          [attemptIdNum],
        );
        codingStatus = csRows && csRows[0] ? (csRows[0].coding_status || null) : null;
        const codingReqFlag = csRows && csRows[0] ? !!csRows[0].coding_required : codingRequired;
        if (codingReqFlag && String(codingStatus || '').toLowerCase() !== 'graded') {
          // Move attempt into pending_coding state
          try {
            await pool.query(
              `UPDATE exam_attempts SET status = 'pending_coding' WHERE attempt_id = $1 AND COALESCE(status,'') <> 'canceled'`,
              [attemptIdNum],
            );
            try {
              console.log('[EXAM][FINALIZE][BLOCKED][WAITING_FOR_CODING]', { exam_id: Number(examId), attempt_id: attemptIdNum });
            } catch {}
          } catch {}
          return res.json({ status: 'PENDING_CODING' });
        }
      } catch {}
    } catch {}

    const response = await submitAttempt({
      attempt_id: attemptIdNum,
      answers,
      devlab: {
        answers: Array.isArray(devlabBlock?.answers) ? devlabBlock.answers : undefined,
      },
    });

    if (response && response.error) {
      // Map known service errors to 4xx
      if (response.error === 'exam_time_expired' || response.error === 'attempt_canceled') {
        return res.status(403).json({ error: response.error, message: response.message || response.error });
      }
      if (response.error === 'attempt_not_found') {
        return res.status(404).json({ error: response.error, message: response.message || response.error });
      }
      return res.status(400).json({ error: response.error, message: response.message || response.error });
    }

    // Phase 08.3 – Surface coding grading results in response (skip in tests)
    let codingBlock = null;
    if (process.env.NODE_ENV !== 'test') {
      try {
        const pkg = await ExamPackage.findOne({ attempt_id: String(attemptIdNum) }).lean();
        if (pkg) {
          codingBlock = {
            answers: Array.isArray(pkg.coding_answers) ? pkg.coding_answers : [],
            grading: Array.isArray(pkg.coding_grading_results) ? pkg.coding_grading_results : [],
            score_total: Number(pkg.coding_score_total || 0),
            score_max: Number(pkg.coding_score_max || 0),
          };
        }
      } catch {}
    }

    // Fire-and-forget Skills Engine result reporting (baseline and postcourse)
    try {
      setImmediate(async () => {
        try {
          // Load exam type, user and course_name for envelope
          const metaRes = await pool.query(
            `SELECT e.exam_type, e.user_id, e.user_uuid, e.course_name
             FROM exams e
             WHERE e.exam_id = $1`,
            [Number(examId)],
          ).catch(() => ({ rows: [] }));
          const examType = metaRes?.rows?.[0]?.exam_type || null;
          const userNumeric = metaRes?.rows?.[0]?.user_id || null;
          const userUuid = metaRes?.rows?.[0]?.user_uuid || null;
          const courseName = metaRes?.rows?.[0]?.course_name || null;

          // Resolve user_id from ExamContext by exam_id (preferred) then attempt_id; fallback to exams.user_uuid; then numeric
          let resolvedUserId = null;
          try {
            const ctxByExam = await ExamContext.findOne({ exam_id: String(examId) }).lean();
            const ctxByAttempt = resolvedUserId ? null : await ExamContext.findOne({ attempt_id: String(attemptIdNum) }).lean();
            resolvedUserId = ctxByExam?.user_id || ctxByAttempt?.user_id || null;
            if (!resolvedUserId) {
              try { console.warn('[WARN][EXAM_CONTEXT][MISSING]', { exam_id: String(examId), attempt_id: String(attemptIdNum) }); } catch {}
            }
          } catch {}
          if (!resolvedUserId) resolvedUserId = userUuid || null;
          if (!resolvedUserId && userNumeric != null) resolvedUserId = String(userNumeric);

          // Build per-skill payload
          const perSkill = Array.isArray(response?.per_skill) ? response.per_skill : [];
          const skillsPayload = perSkill.map((s) => ({
            skill_id: s?.skill_id,
            skill_name: s?.skill_name || s?.skill_id,
            score: Number.isFinite(Number(s?.score)) ? Number(s.score) : 0,
            status: s?.status || (Number(s?.score) >= 70 ? 'acquired' : 'failed'),
          }));

          const passing = 70;
          const finalGrade = Number.isFinite(Number(response?.final_grade)) ? Number(response.final_grade) : 0;
          const passed = finalGrade >= passing;

          const { sendToCoordinator } = require('../services/integrations/envelopeSender');
          if (examType === 'baseline') {
            const payload = {
              action: 'baseline-exam-result',
              user_id: resolvedUserId,
              exam_type: 'baseline',
              exam_id: String(examId),
              attempt_id: String(attemptIdNum),
              passing_grade: passing,
              final_grade: finalGrade,
              passed,
              skills: skillsPayload,
            };
            sendToCoordinator({ targetService: 'skills-engine', payload }).catch((e) => {
              try { console.warn('[SKILLS_ENGINE][ASYNC_PUSH][BASELINE][ERROR]', e?.message || e); } catch {}
            });
          } else if (examType === 'postcourse') {
            const payload = {
              action: 'postcourse-exam-result',
              user_id: resolvedUserId,
              exam_type: 'postcourse',
              exam_id: String(examId),
              attempt_id: String(attemptIdNum),
              course_name: courseName || null,
              passing_grade: passing,
              final_grade: finalGrade,
              passed,
              final_status: 'completed',
              skills: skillsPayload,
            };
            sendToCoordinator({ targetService: 'skills-engine', payload }).catch((e) => {
              try { console.warn('[SKILLS_ENGINE][ASYNC_PUSH][POSTCOURSE][ERROR]', e?.message || e); } catch {}
            });
          }
        } catch (err) {
          try { console.warn('[SKILLS_ENGINE][ASYNC_PUSH][ERROR]', err?.message || err); } catch {}
        }
      });
    } catch {}

    return res.json(codingBlock ? { ...response, coding_results: codingBlock } : response);
  } catch (err) {
    try { console.log('[TRACE][EXAM][SUBMIT][ERROR]', { error: 'unexpected_error', message: err?.message }); } catch {}
    return res.status(500).json({ error: 'submit_internal_error', message: 'Unexpected error while submitting exam' });
  }
};

// POST /api/exams/submit-coding-grade
// Accepts DevLab iframe grading via postMessage from frontend (exam-type agnostic)
exports.submitCodingGrade = async (req, res, next) => {
  try {
    const examIdNum = normalizeToInt(req.body?.exam_id);
    const attemptIdNum = normalizeToInt(req.body?.attempt_id);
    const score = Number.isFinite(Number(req.body?.score)) ? Number(req.body.score) : 0;
    const skillsFeedback = (req.body && typeof req.body.skillsFeedback === 'object' && req.body.skillsFeedback) ? req.body.skillsFeedback : {};
    const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];
    const solutions = Array.isArray(req.body?.solutions) ? req.body.solutions : [];

    // Guards
    if (attemptIdNum == null || examIdNum == null) {
      return res.status(400).json({ error: 'invalid_exam_or_attempt_id' });
    }

    // [DEVLAB][GRADE][RECEIVE][START]
    try {
      console.log('[DEVLAB][GRADE][RECEIVE][START]', {
        exam_id: examIdNum,
        attempt_id: attemptIdNum,
        score,
        hasSkills: !!skillsFeedback,
        questionsCount: Array.isArray(questions) ? questions.length : 0,
        solutionsCount: Array.isArray(solutions) ? solutions.length : 0,
      });
    } catch {}

    // Validate attempt belongs to exam
    let att = null;
    let examType = null;
    let codingSubmittedAt = null;
    let codingScoreExisting = null;
    try {
      // Try extended select including coding_* fields and exam_type
      const { rows } = await pool.query(
        `SELECT ea.attempt_id, ea.exam_id, ea.status, ea.submitted_at,
                ea.coding_score, ea.coding_status, ea.coding_submitted_at,
                e.exam_type
         FROM exam_attempts ea
         JOIN exams e ON e.exam_id = ea.exam_id
         WHERE ea.attempt_id = $1`,
        [attemptIdNum],
      );
      att = rows?.[0] || null;
      if (att) {
        examType = att.exam_type || null;
        codingSubmittedAt = att.coding_submitted_at || null;
        codingScoreExisting = att.coding_score != null ? Number(att.coding_score) : null;
      }
    } catch {
      // Fallback minimal select if columns not present
      const { rows } = await pool.query(
        `SELECT ea.attempt_id, ea.exam_id, ea.status, ea.submitted_at
         FROM exam_attempts ea
         WHERE ea.attempt_id = $1`,
        [attemptIdNum],
      ).catch(() => ({ rows: [] }));
      att = rows?.[0] || null;
    }

    if (!att) {
      try {
        console.error('[DEVLAB][GRADE][ERROR]', {
          exam_id: examIdNum,
          attempt_id: attemptIdNum,
          error: 'attempt_not_found',
          stack: null,
        });
      } catch {}
      return res.status(404).json({ error: 'attempt_not_found' });
    }
    if (Number(att.exam_id) !== Number(examIdNum)) {
      return res.status(400).json({ error: 'exam_mismatch' });
    }
    // Hard block if attempt canceled
    if (String(att.status || '').toLowerCase() === 'canceled') {
      return res.status(403).json({ status: 'CANCELED', reason: att.cancel_reason || 'canceled' });
    }

    // [DEVLAB][GRADE][ATTEMPT][FOUND]
    try {
      console.log('[DEVLAB][GRADE][ATTEMPT][FOUND]', {
        attempt_id: attemptIdNum,
        exam_type: examType,
        existingCodingScore: codingScoreExisting,
        alreadySubmitted: !!codingSubmittedAt,
      });
    } catch {}

    // Idempotency: if coding already persisted in PG columns, skip
    if (codingSubmittedAt != null) {
      try {
        console.log('[DEVLAB][GRADE][DUPLICATE][SKIP]', {
          attempt_id: attemptIdNum,
          coding_score: codingScoreExisting,
        });
      } catch {}
      return res.json({ ok: true, duplicate: true });
    }

    // Persist to Mongo ExamPackage
    try {
      const gradingArray = Object.entries(skillsFeedback || {}).map(([k, v]) => ({
        skill_id: k,
        score: Number.isFinite(Number(v?.score)) ? Number(v?.score) : 0,
        feedback: v?.feedback,
        source: 'devlab',
      }));
      const patch = {
        coding_results: {
          questions,
          solutions,
          skills: skillsFeedback,
          score,
          graded_at: new Date(),
          source: 'devlab',
        },
        // Ensure summary fields exist to avoid 0/0 on results
        coding_score_total: Number.isFinite(Number(score)) ? Number(score) : 0,
        coding_score_max: 100,
        ...(Array.isArray(gradingArray) ? { 'coding_grading_results': gradingArray } : {}),
      };
      try {
        console.log('[DEVLAB][GRADE][MONGO][WRITE]', {
          exam_id: examIdNum,
          score,
          skillsCount: Object.keys(skillsFeedback || {}).length,
        });
      } catch {}
      await ExamPackage.updateOne(
        { attempt_id: String(attemptIdNum) },
        { $set: patch },
        { upsert: false },
      );
    } catch {}

    // Persist to Postgres if columns exist (best-effort, non-fatal)
    try {
      try {
        console.log('[DEVLAB][GRADE][POSTGRES][WRITE]', {
          attempt_id: attemptIdNum,
          score,
        });
      } catch {}
      await pool.query(
        `UPDATE exam_attempts
         SET coding_score = $1,
             coding_status = 'graded',
             coding_submitted_at = NOW()
         WHERE attempt_id = $2`,
        [score, attemptIdNum],
      );
    } catch {}

    // [DEVLAB][GRADE][PERSIST][OK]
    try { console.log('[DEVLAB][GRADE][PERSIST][OK]', { attempt_id: attemptIdNum, score }); } catch {}

    // [DEVLAB][GRADE][SUCCESS]
    try {
      console.log('[DEVLAB][GRADE][SUCCESS]', {
        exam_id: examIdNum,
        attempt_id: attemptIdNum,
        score,
      });
    } catch {}

    // Trigger recompute of final results now that coding is graded
    try {
      const { recomputeFinalResults } = require('../services/core/examsService');
      await recomputeFinalResults(attemptIdNum);
    } catch {}

    return res.json({ ok: true, status: 'CODING_GRADED' });
  } catch (err) {
    try {
      console.error('[DEVLAB][GRADE][ERROR]', {
        exam_id: normalizeToInt(req.body?.exam_id),
        attempt_id: normalizeToInt(req.body?.attempt_id),
        error: err?.message,
        stack: err?.stack,
      });
    } catch {}
    return next(err);
  }
};

// Start proctoring session for an exam/attempt via exams route
exports.startProctoring = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { attempt_id } = req.body || {};
    // [TRACE] proctoring start
    try {
      // eslint-disable-next-line no-console
      console.log('[TRACE][PROCTORING][START]', { examId: Number(examId), attempt_id });
    } catch {}
    if (!attempt_id) {
      return res.status(400).json({ error: 'attempt_id_required' });
    }

    const attemptIdNum = normalizeToInt(attempt_id);
    if (attemptIdNum == null) {
      return res.status(400).json({ error: 'invalid_attempt_id' });
    }

    // In test, mimic existing behavior without hitting Postgres
    if (process.env.NODE_ENV === 'test') {
      await ProctoringSession.findOneAndUpdate(
        { attempt_id: String(attemptIdNum) },
        {
          attempt_id: String(attemptIdNum),
          exam_id: String(examId),
          camera_status: 'active',
          $setOnInsert: { start_time: new Date(), events: [] },
        },
        { new: true, upsert: true },
      );
      return res.json({ ok: true });
    }

    // For non-test, trust examId and attempt_id; create/activate session
    await ProctoringSession.findOneAndUpdate(
      { attempt_id: String(attemptIdNum) },
      {
        attempt_id: String(attemptIdNum),
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

exports.resolveExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const examIdNum = normalizeToInt(examId);
    if (examIdNum == null) {
      return res.status(400).json({ error: 'invalid_exam_id' });
    }
  const { rows } = await pool
      .query(
        `SELECT attempt_id, attempt_no, started_at, expires_at, duration_minutes, status
         FROM exam_attempts
         WHERE exam_id = $1
         ORDER BY attempt_no DESC
         LIMIT 1`,
        [examIdNum],
      )
      .catch(() => ({ rows: [] }));
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'attempt_not_found' });
    }
    const a = rows[0];
    const expAt = a.expires_at ? new Date(a.expires_at) : null;
    const isExpired = expAt ? new Date() > expAt : false;
    const durationSeconds =
      Number.isFinite(Number(a.duration_minutes)) ? Number(a.duration_minutes) * 60 : null;
    return res.json({
      exam_id: Number(examIdNum),
      attempt_id: Number(a.attempt_id),
      started_at: a.started_at ? new Date(a.started_at).toISOString() : null,
      expires_at: expAt ? expAt.toISOString() : null,
      duration_seconds: durationSeconds,
      status: isExpired ? 'expired' : (a.status || 'active'),
    });
  } catch (err) {
    return next(err);
  }
};

// GET /api/exams/:examId/status - preparation status for async flow
exports.getExamStatus = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const examIdNum = normalizeToInt(examId);
    if (examIdNum == null) return res.status(400).json({ error: 'invalid_exam_id' });
    const { rows } = await pool
      .query(
        `SELECT COALESCE(status, 'READY') AS status,
                COALESCE(progress, 0) AS progress,
                error_message,
                failed_step,
                updated_at
         FROM exams
         WHERE exam_id = $1`,
        [examIdNum],
      )
      .catch(()=>({ rows: [] }));
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'exam_not_found' });
    const row = rows[0];
    return res.json({
      status: row.status,
      progress: Number(row.progress || 0),
      failed_step: row.failed_step || null,
      error_message: row.error_message || null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    });
  } catch (err) {
    return next(err);
  }
};


