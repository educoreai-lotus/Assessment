const pool = require('../../config/supabaseDB');

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

module.exports = {
	fetchManagementDailyAttempts,
};


