// Phase 08.5c – Delegates to gateway; no axios/env here
const { sendCourseBuilderExamResults } = require('../gateways/courseBuilderGateway');
const examsService = require('../core/examsService');

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

    // Extract skills from coverage_map (for completeness; not required here)
    const coverage_map = Array.isArray(payload?.coverage_map) ? payload.coverage_map : [];
    const skills = coverage_map.flatMap((item) => Array.isArray(item?.skills) ? item.skills : []);
    void skills;

    const created = await examsService.createExam({
      user_id,
      user_name,
      exam_type: 'postcourse',
      course_id,
      course_name,
    });

    return {
      status: 'postcourse-created',
      exam_id: created?.exam_id ?? null,
      exam_type: 'postcourse',
      course_id: course_id ?? null,
      user_id: user_id ?? null,
      redirect_to: '/app/courses',
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

