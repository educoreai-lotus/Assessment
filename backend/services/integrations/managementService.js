const pool = require('../../config/supabaseDB');
const { getAttemptsForUser, getAttemptDetail } = require('../core/attemptsService');

// Legacy note: ManagementReporting pulls directly via integrationController; no outbound HTTP here.
async function fetchManagementDailyAttempts() {
	const sql = `
SELECT 
  e.user_id,
  e.course_id,
  e.exam_type,
  ea.attempt_no,
  (ea.policy_snapshot->>'passing_grade')::INT AS passing_grade,
  ea.final_grade,
  ea.passed
FROM exam_attempts ea
JOIN exams e ON e.exam_id = ea.exam_id
WHERE ea.submitted_at >= NOW() - INTERVAL '24 hours'
ORDER BY ea.submitted_at DESC;
`;
	const { rows } = await pool.query(sql);
	try {
		// eslint-disable-next-line no-console
		console.log('[INBOUND][MANAGEMENT][DAILY_PULL]', { count: rows?.length || 0 });
	} catch {}
	return (rows || []).map((r) => ({
		user_id: r.user_id != null ? Number(r.user_id) : null,
		course_id: r.course_id != null ? Number(r.course_id) : null,
		exam_type: r.exam_type || null,
		attempt_no: r.attempt_no != null ? Number(r.attempt_no) : null,
		passing_grade: r.passing_grade != null ? Number(r.passing_grade) : null,
		final_grade: r.final_grade != null ? Number(r.final_grade) : null,
		passed: !!r.passed,
	}));
}

async function fetchReportingRecord({ user_id, exam_type, course_id }) {
  const examType = String(exam_type || '').toLowerCase();
  try {
    // eslint-disable-next-line no-console
    console.log('[INBOUND][MANAGEMENT][FETCH_REPORTING_RECORD][REQ]', {
      user_id: user_id != null ? Number(String(user_id).replace(/[^0-9]/g, '')) : null,
      exam_type: examType || null,
      course_id: course_id != null ? Number(course_id) : null,
    });
  } catch {}
  const attempts = await getAttemptsForUser(user_id);
  const filtered = (attempts || []).filter((a) => a.exam_type === examType && (course_id == null || Number(a.course_id) === Number(course_id)));
  const pick = filtered.length > 0 ? filtered[0] : null;
  if (!pick) {
    try {
      // eslint-disable-next-line no-console
      console.log('[INBOUND][MANAGEMENT][FETCH_REPORTING_RECORD][MISS]');
    } catch {}
    return {
      user_id: user_id != null ? Number(String(user_id).replace(/[^0-9]/g, '')) : null,
      course_id: course_id != null ? Number(course_id) : null,
      exam_type: exam_type || null,
      attempt_no: null,
      passing_grade: 0,
      final_grade: null,
      passed: false,
    };
  }
  const detail = await getAttemptDetail(pick.attempt_id);
  try {
    // eslint-disable-next-line no-console
    console.log('[INBOUND][MANAGEMENT][FETCH_REPORTING_RECORD][HIT]', {
      attempt_id: pick.attempt_id,
      attempt_no: detail?.attempt_no ?? pick.attempt_no ?? 1,
      final_grade: detail?.final_grade ?? null,
      passed: !!detail?.passed,
    });
  } catch {}
  return {
    user_id: detail?.user_id ?? null,
    course_id: detail?.course_id ?? null,
    exam_type: detail?.exam_type ?? exam_type,
    attempt_no: detail?.attempt_no ?? pick.attempt_no ?? 1,
    passing_grade: detail?.passing_grade ?? 0,
    final_grade: detail?.final_grade ?? null,
    passed: !!detail?.passed,
  };
}

module.exports = {
	fetchManagementDailyAttempts,
	handleInbound: async (payload) => {
    const action = String(payload?.action || '').toLowerCase();
    if (action === 'fetch-reporting-record') {
      return await fetchReportingRecord({
        user_id: payload?.user_id,
        exam_type: payload?.exam_type,
        course_id: payload?.course_id,
      });
    }
		return await fetchManagementDailyAttempts();
	},
};


