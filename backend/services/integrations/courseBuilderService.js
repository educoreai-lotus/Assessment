// Phase 08.5c – Delegates to gateway; no axios/env here
const { sendCourseBuilderExamResults } = require('../gateways/courseBuilderGateway');
const pool = require('../../config/supabaseDB');
const examsService = require('../core/examsService');
const { ExamContext } = require('../../models');

exports.sendExamResultsToCourseBuilder = async (payloadObj) => {
  return await sendCourseBuilderExamResults(payloadObj || {});
};

// Phase 09 – Inbound handler for Course Builder
exports.handleInbound = async (payload) => {
  const action = String(payload?.action || '').toLowerCase();

  // Legacy/start semantics: accept start-postcourse-exam
  if (action === 'start-postcourse-exam') {
    // Normalize learner_id → user_id
    const user_id = payload?.learner_id;
    const user_name = payload?.learner_name || null;
    const course_id = payload?.course_id;
    const course_name = payload?.course_name;

    // [POSTCOURSE][INBOUND] Persist context only; do NOT create exam here
    try {
      console.log('[POSTCOURSE][INBOUND][COURSE_BUILDER_CONTEXT]', {
        learner_id: user_id || null,
        learner_name: user_name || null,
        course_id: course_id || null,
        course_name: course_name || null,
      });
    } catch {}
    try {
      if (!user_id || !course_id) {
        return { error: 'invalid_payload', missing: ['learner_id', 'course_id'].filter((k)=>!((k==='learner_id'&&user_id)||(k==='course_id'&&course_id))) };
      }
      await ExamContext.findOneAndUpdate(
        { user_id: String(user_id), exam_type: 'postcourse' },
        {
          user_id: String(user_id),
          exam_type: 'postcourse',
          metadata: {
            learner_name: user_name || null,
            course_id: String(course_id),
            course_name: course_name || null,
          },
          updated_at: new Date(),
        },
        { new: true, upsert: true },
      );
    } catch {}

    // Acknowledge receipt; exam is NOT created at this stage
    return {
      status: 'postcourse-context-received',
      exam_type: 'postcourse',
      course_id: course_id ?? null,
      user_id: user_id ?? null,
      next_step: 'frontend_start_exam_requests_coverage_map',
    };
  }

  // New: create_assessment – Course Builder creates Post-Course exam and supplies coverage_map
  if (action === 'create_assessment') {
    const learner_id = payload?.learner_id;
    const course_id = payload?.course_id;
    const course_name = payload?.course_name;
    const coverage_map = Array.isArray(payload?.coverage_map) ? payload.coverage_map : null;

    const missing = [];
    if (!learner_id) missing.push('learner_id');
    if (!course_id) missing.push('course_id');
    if (!course_name) missing.push('course_name');
    if (!Array.isArray(coverage_map)) missing.push('coverage_map');
    if (missing.length > 0) {
      return { error: 'invalid_payload', missing };
    }

    // Create exam/attempt in PREPARING (fast path)
    const created = await examsService.createExamRecord({
      user_id: String(learner_id),
      exam_type: 'postcourse',
      course_id: String(course_id),
      course_name: String(course_name),
      user_name: null,
      company_id: null,
    });

    // Persist coverage snapshot on attempt for later prepareExamAsync
    try {
      if (created?.attempt_id) {
        await pool.query(
          `ALTER TABLE IF NOT EXISTS ONLY exam_attempts ADD COLUMN IF NOT EXISTS coverage_snapshot JSONB`,
        ).catch(() => {});
        await pool.query(
          `UPDATE exam_attempts SET coverage_snapshot = $1::jsonb WHERE attempt_id = $2`,
          [JSON.stringify({ coverage_map }), Number(created.attempt_id)],
        );
        try { console.log('[INBOUND][COURSE_BUILDER][create_assessment][COVERAGE_SNAPSHOT_SAVED]', { attempt_id: created.attempt_id, items: coverage_map.length }); } catch {}
      }
    } catch (e) {
      try { console.log('[INBOUND][COURSE_BUILDER][create_assessment][COVERAGE_SNAPSHOT_ERROR]', { message: e?.message }); } catch {}
      // continue; prep will fail with clear error if snapshot missing
    }

    // Kick off preparation with injected coverage_map (skip external coverage fetch)
    try {
      const examId = created?.exam_id;
      const attemptId = created?.attempt_id;
      if (examId && attemptId) {
        setImmediate(() => {
          examsService.prepareExamAsync(examId, attemptId, {
            user_id: String(learner_id),
            exam_type: 'postcourse',
            course_id: String(course_id),
            course_name: String(course_name),
            coverage_map, // injection for prepare flow
          }).catch((e) => {
            try { console.log('[TRACE][INTEGRATION][COURSE_BUILDER][create_assessment][PREP_ERROR]', { message: e?.message }); } catch {}
          });
        });
      }
    } catch {}

    return {
      success: true,
      exam_id: created?.exam_id ?? null,
      attempt_id: created?.attempt_id ?? null,
      status: 'PREPARING',
      start_url: created?.exam_id ? `/api/exams/${encodeURIComponent(created.exam_id)}/start` : undefined,
      readiness: { poll: `/api/exams/${encodeURIComponent(created?.exam_id ?? '')}` },
    };
  }

  return { error: 'unsupported_action' };
};

