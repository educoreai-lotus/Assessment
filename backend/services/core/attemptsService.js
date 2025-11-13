const pool = require('../../config/supabaseDB');
const { ExamPackage } = require('../../models');

function toPrefixed(id, prefix) {
  if (id == null) return null;
  return `${prefix}_${Number(id)}`;
}

const { mapUserId } = require('./idMapper');

async function getAttemptsForUser(userId) {
  // PostgreSQL queries use numeric mapped IDs; API returns original IDs
  const userInt = mapUserId(userId);
  if (userInt == null || Number.isNaN(userInt)) return [];
  const { rows } = await pool.query(
    `
      SELECT ea.attempt_id, ea.attempt_no, ea.final_grade, ea.passed, ea.submitted_at,
             e.exam_id, e.exam_type, e.course_id
      FROM exam_attempts ea
      JOIN exams e ON e.exam_id = ea.exam_id
      WHERE e.user_id = $1
      ORDER BY ea.attempt_id DESC
    `,
    [userInt]
  );
  return rows.map((r) => ({
    user_id: userId,
    course_id: toPrefixed(r.course_id, 'c'),
    exam_type: r.exam_type,
    attempt_id: r.attempt_id,
    attempt_no: r.attempt_no,
    passing_grade: (r.policy_snapshot || {})?.passing_grade ?? undefined, // may be undefined in this summary
    final_grade: r.final_grade != null ? Number(r.final_grade) : null,
    passed: !!r.passed,
    submitted_at: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
  }));
}

async function getAttemptDetail(attemptId) {
  const { rows } = await pool.query(
    `
      SELECT ea.*, e.exam_type, e.course_id
      FROM exam_attempts ea
      JOIN exams e ON e.exam_id = ea.exam_id
      WHERE ea.attempt_id = $1
    `,
    [attemptId]
  );
  if (rows.length === 0) return null;
  const a = rows[0];
  const { rows: skillRows } = await pool.query(
    `SELECT * FROM attempt_skills WHERE attempt_id = $1 ORDER BY skill_id ASC`,
    [attemptId]
  );
  const pkg = await ExamPackage.findOne({ attempt_id: String(attemptId) }).lean();
  const courseName = pkg?.metadata?.course_name || null;
  const policy = a.policy_snapshot || {};
  const base = {
    user_id: pkg?.user?.user_id || null,
    exam_type: a.exam_type,
    passing_grade: Number(policy?.passing_grade ?? 0),
    final_grade: a.final_grade != null ? Number(a.final_grade) : null,
    passed: !!a.passed,
    skills: skillRows.map((s) => ({
      skill_id: s.skill_id,
      skill_name: s.skill_name,
      score: Number(s.score),
      status: s.status,
    })),
    submitted_at: a.submitted_at ? new Date(a.submitted_at).toISOString() : null,
  };
  if (a.exam_type === 'postcourse') {
    return {
      ...base,
      course_id: toPrefixed(a.course_id, 'c'),
      course_name: courseName,
      attempt_no: a.attempt_no,
      max_attempts: Number(policy?.max_attempts ?? 0) || undefined,
    };
  }
  return base;
}

async function getAttemptSkills(attemptId) {
  const { rows } = await pool.query(
    `SELECT ea.attempt_id, e.exam_type
     FROM exam_attempts ea
     JOIN exams e ON e.exam_id = ea.exam_id
     WHERE ea.attempt_id = $1`,
    [attemptId]
  ).catch(() => ({ rows: [] }));
  const base = rows[0] || {};
  const pkg = await ExamPackage.findOne({ attempt_id: String(attemptId) }).lean();
  const { rows: skillRows } = await pool.query(
    `SELECT * FROM attempt_skills WHERE attempt_id = $1 ORDER BY skill_id ASC`,
    [attemptId]
  );
  return {
    attempt_id: Number(attemptId),
    user_id: pkg?.user?.user_id || null,
    exam_type: base.exam_type || null,
    skills: skillRows.map((s) => ({
      skill_id: s.skill_id,
      skill_name: s.skill_name,
      score: Number(s.score),
      status: s.status,
    })),
  };
}

module.exports = { getAttemptsForUser, getAttemptDetail, getAttemptSkills };


