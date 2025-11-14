const pool = require('../../config/supabaseDB');
const { ExamPackage, AiAuditTrail } = require('../../models');
const { safeFetchPolicy, safePushExamResults: safePushDirectoryResults } = require('../gateways/directoryGateway');
const { safeFetchBaselineSkills, safePushAssessmentResults: safePushSkillsResults } = require('../gateways/skillsEngineGateway');
const { safeFetchCoverage, safePushExamResults: safePushCourseBuilderResults } = require('../gateways/courseBuilderGateway');
const { safeGetCodingQuestions, safeRequestTheoreticalValidation } = require('../gateways/devlabGateway');
const { safeSendSummary } = require('../gateways/protocolCameraGateway');
const { mapUserId } = require('./idMapper');

function toIntId(prefixed) {
  if (typeof prefixed !== 'string') return null;
  const m = prefixed.match(/^[a-z]+_(\d+)$/i);
  return m ? parseInt(m[1], 10) : null;
}

function nowIso() {
  return new Date().toISOString();
}

function removeHintsDeep(input) {
  if (input == null) return input;
  if (Array.isArray(input)) {
    return input.map((item) => removeHintsDeep(item));
  }
  if (typeof input === 'object') {
    const clone = {};
    for (const [key, value] of Object.entries(input)) {
      if (key === 'hints') continue;
      clone[key] = removeHintsDeep(value);
    }
    return clone;
  }
  return input;
}

async function buildExamPackageDoc({ exam_id, attempt_id, user_id, exam_type, policy, skills, coverage_map, course_id, course_name, questions }) {
  const doc = new ExamPackage({
    exam_id: String(exam_id),
    attempt_id: String(attempt_id),
    user: { user_id, name: undefined, email: undefined },
    questions: (questions || []).map((q) => ({
      question_id: q.qid || q.question_id || q.id || '',
      skill_id: q.skill_id,
      // Strip any hints from persisted prompt to prevent storage/exposure
      prompt: removeHintsDeep(q),
      options: Array.isArray(q?.choices) ? q.choices : [],
      answer_key: q?.correct_answer ?? null,
      metadata: { type: q.type || 'mcq', difficulty: q.difficulty || 'medium' },
    })),
    coverage_map: coverage_map || [],
    final_status: 'draft',
    lineage: {
      generation_refs: [],
    },
    metadata: {
      exam_type,
      policy,
      skills,
      course_id,
      course_name,
    },
  });
  await doc.save();
  return doc;
}

async function createExam({ user_id, exam_type, course_id, course_name }) {
  // Fetch upstream data via gateways with safe mocks
  let policy = {};
  let skillsPayload = null;
  let coveragePayload = null;

  if (exam_type === 'baseline') {
    skillsPayload = await safeFetchBaselineSkills({ user_id });
    // Directory policy for baseline (may include passing_grade only; include max_attempts if provided)
    policy = await safeFetchPolicy('baseline');
  } else if (exam_type === 'postcourse') {
    coveragePayload = await safeFetchCoverage({
      learner_id: user_id,
      learner_name: undefined,
      course_id,
    });
    policy = await safeFetchPolicy('postcourse');
  } else {
    throw new Error('invalid_exam_type');
  }

  // Optional questions (DevLab)
  const coding = await safeGetCodingQuestions();
  const theoreticalReq = {
    exam_id: 'ex_temp',
    attempt_id: 'att_temp',
    difficulty: 'hard',
    question: {
      type: 'mcq',
      stem: 'Which statement about event loop and microtasks in JavaScript is true?',
      choices: [
        'Microtasks run before rendering and before next macrotask.',
        'Microtasks run after each macrotask batch completes.',
        'Microtasks run after DOM updates.',
        'Microtasks run only during async/await functions.',
      ],
      correct_answer: 'Microtasks run before rendering and before next macrotask.',
      hints: [
        'Hint 1: Think about microtasks and macrotasks scheduling order.',
        'Hint 2: Microtasks often come from Promises.',
        'Hint 3: They execute before the next rendering phase.',
      ],
    },
  };
  const theoreticalResp = await safeRequestTheoreticalValidation(theoreticalReq);
  // Log AI audit if available
  try {
    await AiAuditTrail.create({
      attempt_id: 'pending',
      event_type: 'prompt',
      model: { provider: 'devlab', name: 'validator', version: 'v1' },
      prompt: theoreticalReq,
      response: theoreticalResp,
      status: 'success',
    });
  } catch {}

  // Insert exam row in PG (map user_id 'u_123' -> 123 for FK)
  const userInt = mapUserId(user_id);
  console.log('createExam user mapping:', { user_id, userInt });
  const courseInt = course_id ? toIntId(course_id) : null;

  // Baseline exam: only one baseline exam per user is allowed
  if (exam_type === 'baseline') {
    const { rows: existingBaseline } = await pool.query(
      `SELECT 1 FROM exams WHERE exam_type = $1 AND user_id = $2 LIMIT 1`,
      ['baseline', userInt]
    );
    if (existingBaseline.length > 0) {
      return { error: 'baseline_already_exists' };
    }
  }

  const insertExamText = `
    INSERT INTO exams (exam_type, user_id, course_id)
    VALUES ($1, $2, $3)
    RETURNING exam_id
  `;
  const { rows: examRows } = await pool.query(insertExamText, [exam_type, userInt, courseInt]);
  const examId = examRows[0].exam_id;

  // Prepare skills and coverage map
  const skillsArray = skillsPayload?.skills || [];
  const coverageMap = coveragePayload?.coverage_map || [];
  const resolvedCourseId = exam_type === 'postcourse' ? (coveragePayload?.course_id || course_id || null) : null;
  const resolvedCourseName = exam_type === 'postcourse' ? (coveragePayload?.course_name || course_name || null) : null;

  // Insert initial attempt (attempt_no = 1)
  const policySnapshot = policy || {};
  const insertAttemptText = `
    INSERT INTO exam_attempts (exam_id, attempt_no, policy_snapshot, package_ref)
    VALUES ($1, $2, $3::jsonb, $4)
    RETURNING attempt_id
  `;
  // Temporarily set package_ref after creating package
  const tempPackageRef = null;
  const { rows: attemptRows } = await pool.query(insertAttemptText, [examId, 1, JSON.stringify(policySnapshot), tempPackageRef]);
  const attemptId = attemptRows[0].attempt_id;

  // Build ExamPackage in Mongo
  const questions = [
    ...(coding?.questions || []),
    // include theoretical as a "question" prompt too
    theoreticalReq.question,
  ];
  const pkg = await buildExamPackageDoc({
    exam_id: examId,
    attempt_id: attemptId,
    user_id,
    exam_type,
    policy: policySnapshot,
    skills: skillsArray,
    coverage_map: coverageMap,
    course_id: resolvedCourseId,
    course_name: resolvedCourseName || undefined,
    questions,
  });

  // Backfill package_ref in PG
  await pool.query(
    `UPDATE exam_attempts SET package_ref = $1 WHERE attempt_id = $2`,
    [pkg._id, attemptId]
  );

  // Build API response
  return {
    exam_id: examId,
    attempt_id: attemptId,
    exam_type,
    user_id,
    course_id: resolvedCourseId || null,
    passing_grade: policySnapshot?.passing_grade ?? null,
    max_attempts: policySnapshot?.max_attempts ?? null,
    policy_snapshot: policySnapshot,
  };
}

async function markAttemptStarted({ attempt_id }) {
  // Load attempt, exam, and policy to enforce rules
  const { rows: attemptRows } = await pool.query(
    `SELECT ea.attempt_id, ea.exam_id, ea.attempt_no, ea.policy_snapshot, e.exam_type
     FROM exam_attempts ea
     JOIN exams e ON e.exam_id = ea.exam_id
     WHERE ea.attempt_id = $1`,
    [attempt_id]
  );
  if (attemptRows.length === 0) {
    throw new Error('attempt_not_found');
  }
  const attempt = attemptRows[0];
  const examType = attempt.exam_type;

  // Count existing attempts for this exam
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM exam_attempts WHERE exam_id = $1`,
    [attempt.exam_id]
  );
  const attemptsCount = countRows[0]?.cnt ?? 0;

  if (examType === 'baseline') {
    // Only one attempt allowed; block if attempt_no > 1 or attemptsCount > 1
    if (attempt.attempt_no > 1 || attemptsCount > 1) {
      return { error: 'baseline_attempt_not_allowed' };
    }
  } else if (examType === 'postcourse') {
    const policySnapshot = attempt.policy_snapshot || {};
    const maxAttempts = Number(policySnapshot?.max_attempts ?? 1);
    if (Number.isFinite(maxAttempts) && maxAttempts > 0) {
      // If attempts already equal or exceed max, block starting
      if (attemptsCount > maxAttempts || attempt.attempt_no > maxAttempts) {
        return { error: 'max_attempts_reached' };
      }
    }
  }

  await pool.query(`UPDATE exam_attempts SET started_at = NOW() WHERE attempt_id = $1`, [attempt_id]);
  return { ok: true };
}

async function getPackageByExamId(exam_id) {
  const doc = await ExamPackage.findOne({ exam_id: String(exam_id) }).sort({ created_at: -1 }).lean();
  if (!doc) return doc;
  if (Array.isArray(doc.questions)) {
    doc.questions = doc.questions.map((q) => ({
      ...q,
      prompt: removeHintsDeep(q?.prompt),
    }));
  }
  return doc;
}

async function getPackageByAttemptId(attempt_id) {
  const doc = await ExamPackage.findOne({ attempt_id: String(attempt_id) }).sort({ created_at: -1 }).lean();
  if (!doc) return doc;
  if (Array.isArray(doc.questions)) {
    doc.questions = doc.questions.map((q) => ({
      ...q,
      prompt: removeHintsDeep(q?.prompt),
    }));
  }
  return doc;
}

async function submitAttempt({ attempt_id, user_id, answers, per_skill }) {
  // Fetch attempt and policy snapshot
  const { rows: attemptRows } = await pool.query(
    `SELECT ea.*, e.exam_type, e.course_id FROM exam_attempts ea JOIN exams e ON e.exam_id = ea.exam_id WHERE ea.attempt_id = $1`,
    [attempt_id]
  );
  if (attemptRows.length === 0) {
    throw new Error('attempt_not_found');
  }
  const attempt = attemptRows[0];
  const examType = attempt.exam_type;
  const policy = attempt.policy_snapshot || {};
  const passing = Number(policy?.passing_grade ?? 0);

  // Compute final grade
  const skillScores = Array.isArray(per_skill) ? per_skill.map((s) => Number(s.score || 0)) : [];
  const finalGrade =
    skillScores.length > 0 ? (skillScores.reduce((a, b) => a + b, 0) / skillScores.length) : 0;
  const passed = finalGrade >= passing;

  // Persist attempt summary
  await pool.query(
    `
      UPDATE exam_attempts
      SET submitted_at = NOW(),
          final_grade = $1,
          passed = $2
      WHERE attempt_id = $3
    `,
    [finalGrade, passed, attempt_id]
  );

  // Upsert attempt_skills
  if (Array.isArray(per_skill)) {
    for (const s of per_skill) {
      await pool.query(
        `
          INSERT INTO attempt_skills (attempt_id, skill_id, skill_name, score, status)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (attempt_id, skill_id) DO UPDATE SET
            skill_name = EXCLUDED.skill_name,
            score = EXCLUDED.score,
            status = EXCLUDED.status
        `,
        [attempt_id, s.skill_id, s.skill_name, s.score, s.status]
      );
    }
  }

  // Push to outbox_integrations (Directory, Skills Engine, Course Builder, Protocol Camera summary)
  const submittedAtIso = nowIso();
  const payloadDirectory = {
    course_id: attempt.course_id ? `c_${attempt.course_id}` : null,
    user_id,
    attempt_no: attempt.attempt_no || 1,
    exam_type: examType,
    final_grade: Number(finalGrade),
    passing_grade: Number(passing),
    passed,
    submitted_at: submittedAtIso,
  };
  await pool.query(
    `INSERT INTO outbox_integrations (event_type, payload, target_service) VALUES ($1, $2::jsonb, $3)`,
    ['exam_submission', JSON.stringify(payloadDirectory), 'directory']
  );
  // Try immediate push via gateway (non-blocking)
  safePushDirectoryResults(payloadDirectory).catch(() => {});

  const payloadSkills = {
    user_id,
    exam_type: examType,
    passing_grade: Number(passing),
    final_grade: Number(finalGrade),
    passed,
    skills: (per_skill || []).map((s) => ({
      skill_id: s.skill_id,
      skill_name: s.skill_name,
      score: s.score,
      status: s.status,
    })),
  };
  if (examType === 'postcourse') {
    payloadSkills.course_id = attempt.course_id ? `c_${attempt.course_id}` : null;
    payloadSkills.coverage_map = ((await getPackageByAttemptId(attempt_id))?.coverage_map || []).map((cm) => cm);
    payloadSkills.final_status = 'completed';
  }
  await pool.query(
    `INSERT INTO outbox_integrations (event_type, payload, target_service) VALUES ($1, $2::jsonb, $3)`,
    ['skills_engine_results', JSON.stringify(payloadSkills), 'skills_engine']
  );
  safePushSkillsResults(payloadSkills).catch(() => {});

  if (examType === 'postcourse') {
    const payloadCourseBuilder = {
      user_id,
      course_id: attempt.course_id ? `c_${attempt.course_id}` : null,
      exam_type: 'postcourse',
      passing_grade: Number(passing),
      final_grade: Number(finalGrade),
      passed,
    };
    await pool.query(
      `INSERT INTO outbox_integrations (event_type, payload, target_service) VALUES ($1, $2::jsonb, $3)`,
      ['course_builder_results', JSON.stringify(payloadCourseBuilder), 'course_builder']
    );
    safePushCourseBuilderResults(payloadCourseBuilder).catch(() => {});
  }

  // Protocol Camera summary
  const protoSummary = {
    attempt_id: `att_${attempt_id}`,
    summary: {
      events_total: 5,
      violations: 1,
      terminated: false,
    },
  };
  await pool.query(
    `INSERT INTO outbox_integrations (event_type, payload, target_service) VALUES ($1, $2::jsonb, $3)`,
    ['protocol_camera_summary', JSON.stringify(protoSummary), 'protocol_camera']
  );
  safeSendSummary(protoSummary).catch(() => {});

  return {
    user_id,
    exam_type: examType,
    course_id: attempt.course_id ? `c_${attempt.course_id}` : null,
    attempt_id,
    attempt_no: attempt.attempt_no || 1,
    passing_grade: Number(passing),
    final_grade: Number(finalGrade),
    passed,
    skills: (per_skill || []).map((s) => ({
      skill_id: s.skill_id,
      skill_name: s.skill_name,
      score: s.score,
      status: s.status,
    })),
    submitted_at: submittedAtIso,
  };
}

module.exports = {
  createExam,
  markAttemptStarted,
  getPackageByExamId,
  getPackageByAttemptId,
  submitAttempt,
};


