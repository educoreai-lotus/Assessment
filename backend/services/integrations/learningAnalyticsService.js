const { getAttemptsForUser, getAttemptDetail } = require('../core/attemptsService');

// Phase 09 – Inbound handler for Learning Analytics
exports.handleInbound = async (payload) => {
  const action = String(payload?.action || '').toLowerCase();
  if (action !== 'fetch-exam-data') {
    return { error: 'unsupported_action' };
  }

  const user_id = payload?.user_id;
  const examType = String(payload?.exam_type || '').toLowerCase() === 'baseline' ? 'baseline' : 'postcourse';

  // Find latest attempt for user and exam type
  const attempts = await getAttemptsForUser(user_id);
  const latest = (attempts || []).find((a) => a.exam_type === examType);
  if (!latest) {
    // Minimal empty response
    if (examType === 'baseline') {
      return {
        user_id: user_id != null ? Number(String(user_id).replace(/[^0-9]/g, '')) : null,
        exam_type: 'baseline',
        passing_grade: 0,
        final_grade: null,
        passed: false,
        skills: [],
        submitted_at: null,
      };
    }
    return {
      user_id: user_id != null ? Number(String(user_id).replace(/[^0-9]/g, '')) : null,
      exam_type: 'postcourse',
      course_id: null,
      course_name: null,
      attempt_no: 1,
      passing_grade: 0,
      max_attempts: 0,
      final_grade: null,
      passed: false,
      skills: [],
      submitted_at: null,
    };
  }

  const detail = await getAttemptDetail(latest.attempt_id);
  // detail already conforms to the required structures per type
  return detail;
};

