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

const pool = require('../../config/supabaseDB');
const { ExamPackage } = require('../../models');
const { normalizeToInt } = require('./idNormalizer');

async function getAttemptsForUser(userId) {
  // Accept both numeric and UUID identifiers
  const userStr = String(userId);
  const userInt = Number(userStr.replace(/[^0-9]/g, ""));
  const maybeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userStr) ? userStr : null;
  const { rows } = await pool.query(
    `
      SELECT ea.attempt_id, ea.attempt_no, ea.final_grade, ea.passed, ea.submitted_at,
             e.exam_id, e.exam_type, e.course_id
      FROM exam_attempts ea
      JOIN exams e ON e.exam_id = ea.exam_id
      WHERE (e.user_id = $1 OR e.user_uuid = $2::uuid)
      ORDER BY ea.created_at DESC NULLS LAST, ea.attempt_id DESC
    `,
    [Number.isFinite(userInt) ? userInt : null, maybeUuid]
  );
  return rows.map((r) => ({
    exam_id: r.exam_id,
    user_id: Number(userInt),
    course_id: r.course_id != null ? Number(r.course_id) : null,
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
  const attemptInt = normalizeToInt(attemptId);
  if (attemptInt == null || Number.isNaN(attemptInt)) return null;
  const { rows } = await pool.query(
    `
      SELECT ea.*, e.exam_type, e.course_id
      FROM exam_attempts ea
      JOIN exams e ON e.exam_id = ea.exam_id
      WHERE ea.attempt_id = $1
    `,
    [attemptInt]
  );
  if (rows.length === 0) return null;
  const a = rows[0];
  const status = a.status || null;
  const cancelReason = a.cancel_reason || null;
  const { rows: skillRows } = await pool.query(
    `SELECT * FROM attempt_skills WHERE attempt_id = $1 ORDER BY skill_id ASC`,
    [attemptInt]
  );
  const pkg = await ExamPackage.findOne({ attempt_id: String(attemptInt) }).lean();
  const courseName = pkg?.metadata?.course_name || null;
  const policy = a.policy_snapshot || {};
  const userIdNormalized = normalizeToInt(pkg?.user?.user_id);
  const base = {
    exam_id: a.exam_id,
    user_id: userIdNormalized != null ? Number(userIdNormalized) : null,
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
    status: status,
    cancel_reason: cancelReason,
    submitted_at: a.submitted_at ? new Date(a.submitted_at).toISOString() : null,
  };
  if (a.exam_type === 'postcourse') {
    const rawMax = policy && policy.max_attempts;
    const defaultMaxAttempts = 3;
    const maxAttempts = Number.isFinite(Number(rawMax))
      ? Number(rawMax)
      : defaultMaxAttempts;
    // Prefer Mongo's original string identifiers for course linkage
    const courseIdFromPkg =
      (pkg && (pkg.course_id || pkg?.metadata?.course_id)) ? String(pkg.course_id || pkg.metadata.course_id) : null;
    return {
      ...base,
      course_id: courseIdFromPkg != null ? courseIdFromPkg : (a.course_id != null ? String(a.course_id) : null),
      course_name: courseName,
      attempt_no: a.attempt_no,
      max_attempts: maxAttempts,
    };
  }
  // Attach coding results summary if present
  if (pkg) {
    const codingBlock = {
      answers: Array.isArray(pkg.coding_answers) ? pkg.coding_answers : [],
      grading: Array.isArray(pkg.coding_grading_results) ? pkg.coding_grading_results : [],
      score_total: Number(pkg.coding_score_total || 0),
      score_max: Number(pkg.coding_score_max || 0),
    };
    return { ...base, coding_results: codingBlock };
  }
  return base;
}

async function getAttemptSkills(attemptId) {
  const attemptInt = normalizeToInt(attemptId);
  if (attemptInt == null || Number.isNaN(attemptInt)) return {
    attempt_id: null,
    user_id: null,
    exam_type: null,
    skills: [],
  };
  const { rows } = await pool.query(
    `SELECT ea.attempt_id, e.exam_type
     FROM exam_attempts ea
     JOIN exams e ON e.exam_id = ea.exam_id
     WHERE ea.attempt_id = $1`,
    [attemptInt]
  ).catch(() => ({ rows: [] }));
  const base = rows[0] || {};
  const pkg = await ExamPackage.findOne({ attempt_id: String(attemptInt) }).lean();
  const { rows: skillRows } = await pool.query(
    `SELECT * FROM attempt_skills WHERE attempt_id = $1 ORDER BY skill_id ASC`,
    [attemptInt]
  );
  const userIdNormalized = normalizeToInt(pkg?.user?.user_id);
  return {
    attempt_id: Number(attemptInt),
    user_id: userIdNormalized != null ? Number(userIdNormalized) : null,
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


