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
    const learner_name = payload?.learner_name || null;
    const course_id = payload?.course_id;
    const course_name = payload?.course_name || null;

    // Phase 1 ingestion: Persist context only; never create exam/attempt here
    try {
      console.log('[POSTCOURSE][INBOUND][COURSE_BUILDER_CONTEXT]', {
        learner_id: learner_id || null,
        learner_name: learner_name || null,
        course_id: course_id || null,
        course_name: course_name || null,
      });
    } catch {}

    if (!learner_id || !course_id) {
      return { status: 'ignored', reason: 'missing_required_ids' };
    }

    try {
      await ExamContext.findOneAndUpdate(
        { user_id: String(learner_id), exam_type: 'postcourse' },
        {
          user_id: String(learner_id),
          exam_type: 'postcourse',
          metadata: {
            learner_name: learner_name || null,
            course_id: String(course_id),
            course_name: course_name || null,
          },
          updated_at: new Date(),
        },
        { new: true, upsert: true },
      );
    } catch {}

    // No exam build, no DevLab, no coverage required at this stage
    return { status: 'context_ingested' };
  }

  return { error: 'unsupported_action' };
};

