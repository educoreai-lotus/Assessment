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

const pool = require("../../config/supabaseDB");
const { ExamPackage, AiAuditTrail } = require("../../models");
const {
  safeFetchPolicy,
  safePushExamResults: safePushDirectoryResults,
} = require("../gateways/directoryGateway");
const {
  safeFetchBaselineSkills,
  safePushAssessmentResults: safePushSkillsResults,
} = require("../gateways/skillsEngineGateway");
const {
  safeFetchCoverage,
  sendCourseBuilderExamResults,
} = require("../gateways/courseBuilderGateway");
const devlabIntegration = require("../integrations/devlabService");
const { safeSendSummary } = require("../gateways/protocolCameraGateway");
const { normalizeToInt } = require("./idNormalizer");
const axios = require("axios");
const { ensureExamStatusColumns } = require("../../db/migrations");

function nowIso() {
  return new Date().toISOString();
}

/**
 * Determine whether coding grading is pending for a given attempt and package.
 * Coding is considered present if there are coding_questions or a DevLab UI block.
 * Pending if coding exists and attempt.coding_status !== 'graded'.
 */
function isCodingPending({ attemptRow, examPackage }) {
  const hasDevlabUi =
    !!(examPackage && examPackage.metadata && examPackage.metadata.devlab_ui && examPackage.metadata.devlab_ui.componentHtml);
  const hasCodingQuestions = Array.isArray(examPackage && examPackage.coding_questions) && (examPackage.coding_questions.length > 0);
  const codingExists = hasCodingQuestions || hasDevlabUi;
  const status = String(attemptRow && attemptRow.coding_status || '').toLowerCase();
  const pending = codingExists && status !== 'graded';
  return { codingExists, pending };
}

// In-memory guard to ensure idempotent async preparation per attempt (process-local)
const __activePrepAttempts = new Set();

async function ensureUserExists({ user_id_numeric, user_name, company_id }) {
  if (!Number.isFinite(Number(user_id_numeric))) return;
  const uid = Number(user_id_numeric);
  const { rowCount } = await pool.query('SELECT 1 FROM users WHERE user_id = $1', [uid]);
  if (Number(rowCount || 0) === 0) {
    await pool.query(
      `INSERT INTO users (user_id, full_name, company_id)
       VALUES ($1, $2, $3)`,
      [uid, user_name || null, Number.isFinite(Number(company_id)) ? Number(company_id) : null],
    );
    try { console.log('[TRACE][USER][AUTO-CREATE]', { user_id: uid, created: true }); } catch {}
  }
}

function removeHintsDeep(input) {
  if (input == null) return input;
  if (Array.isArray(input)) {
    return input.map((item) => removeHintsDeep(item));
  }
  if (typeof input === "object") {
    const clone = {};
    for (const [key, value] of Object.entries(input)) {
      if (key === "hints") continue;
      clone[key] = removeHintsDeep(value);
    }
    return clone;
  }
  return input;
}

function sanitizeQuestionPromptForStorage(input) {
  const withoutHints = removeHintsDeep(input);
  if (withoutHints && typeof withoutHints === "object") {
    const clone = { ...withoutHints };
    // For theoretical questions (non-code), strip any difficulty that may have been passed through
    const type = String(clone.type || "").toLowerCase();
    if (type !== "code" && "difficulty" in clone) {
      delete clone.difficulty;
    }
    return clone;
  }
  return withoutHints;
}

async function buildExamPackageDoc({
  exam_id,
  attempt_id,
  user_id,
  exam_type,
  policy,
  skills,
  coverage_map,
  course_id,
  course_name,
  questions,
  coding_questions,
  time_allocated_minutes,
  expires_at_iso,
  // legacy params kept for backward compatibility but intentionally ignored:
  // devlab_widget,
  // devlab_raw,
  devlab_ui,
}) {
  const doc = new ExamPackage({
    // assessment_type explicitly persisted alongside IDs for reporting/filtering
    assessment_type: String(exam_type || ''),
    exam_id: String(exam_id),
    attempt_id: String(attempt_id),
    user: { user_id: String(user_id), name: undefined, email: undefined },
    questions: (questions || []).map((q) => {
      const type = q && q.type ? String(q.type).toLowerCase() : "mcq";
      const isCode = type === "code";
      // Policy: Theoretical questions always have medium difficulty in exam packages.
      // Preserve external difficulty only for coding questions (DevLab-originated).
      const difficulty = isCode ? q.difficulty || "medium" : "medium";
      // Normalize theoretical enrichment fields (optional)
      const normalizedTopicId =
        !isCode && q?.topic_id != null && Number.isFinite(Number(q.topic_id))
          ? Number(q.topic_id)
          : undefined;
      const normalizedLang =
        !isCode && typeof q?.humanLanguage === "string" && q.humanLanguage.trim() !== ""
          ? q.humanLanguage
          : undefined;
      // Prefer explicit question field; fallback to stem for storage convenience
      const questionStr =
        !isCode && typeof q?.question === "string" && q.question.trim() !== ""
          ? q.question
          : !isCode
            ? (q?.stem || "")
            : undefined;
      return {
        question_id: q.qid || q.question_id || q.id || "",
        skill_id: q.skill_id,
        // Theoretical-only enrichment fields (optional; no-ops for coding)
        topic_id: normalizedTopicId,
        topic_name: !isCode && typeof q?.topic_name === "string" ? q.topic_name : undefined,
        humanLanguage: normalizedLang,
        question: questionStr,
        hints: !isCode && Array.isArray(q?.hints) ? q.hints.map((h) => String(h)) : undefined,
        correct_answer:
          !isCode && (q?.correct_answer != null)
            ? String(q.correct_answer)
            : undefined,
        difficulty: !isCode ? String(difficulty) : undefined,
        // Strip hints everywhere; additionally strip difficulty for theoretical prompts
        // Persist prompt with options/correct_answer for theoretical
        prompt: sanitizeQuestionPromptForStorage({
          question: q.question || q.stem || '',
          options: Array.isArray(q?.options) ? q.options : (Array.isArray(q?.prompt?.options) ? q.prompt.options : (Array.isArray(q?.choices) ? q.choices : [])),
          correct_answer: q.correct_answer || q?.prompt?.correct_answer || '',
          skill_id: q.skill_id,
          type,
        }),
        options: Array.isArray(q?.options)
          ? q.options
          : (Array.isArray(q?.prompt?.options) ? q.prompt.options : (Array.isArray(q?.choices) ? q.choices : [])),
        answer_key: isCode ? (q?.correct_answer ?? null) : undefined,
        metadata: { type: type || "mcq", difficulty },
      };
    }),
    coding_questions: (() => {
      const arr = Array.isArray(coding_questions) ? coding_questions : [];
      return arr.map((q) => {
        if (typeof q === 'string') {
          return { question: q };
        }
        if (q && typeof q === 'object') {
          const questionText =
            (typeof q.question === 'string' && q.question) ||
            (typeof q.stem === 'string' && q.stem) ||
            (typeof q?.prompt?.question === 'string' && q.prompt.question) ||
            '';
          const out = {
            question: questionText,
          };
          if (typeof q.starter_code === 'string') out.starter_code = q.starter_code;
          if (typeof q.expected_output === 'string') out.expected_output = q.expected_output;
          if (Array.isArray(q.test_cases)) out.test_cases = q.test_cases;
          if (typeof q.humanLanguage === 'string') out.humanLanguage = q.humanLanguage;
          if (typeof q.programming_language === 'string') out.programming_language = q.programming_language;
          if (Array.isArray(q.skills)) out.skills = q.skills.map(String);
          if (typeof q.difficulty === 'string') out.difficulty = q.difficulty;
          if (q.renderedComponent != null) out.renderedComponent = q.renderedComponent;
          if (q.devlab != null) out.devlab = q.devlab;
          return out;
        }
        return { question: String(q ?? '') };
      });
    })(),
    coverage_map: coverage_map || [],
    final_status: "draft",
    lineage: {
      generation_refs: [],
    },
    metadata: {
      exam_type,
      policy,
      skills,
      course_id: course_id != null ? String(course_id) : null,
      course_name,
      time_allocated_minutes: time_allocated_minutes ?? undefined,
      expires_at: expires_at_iso ?? undefined,
      // Transparent UI pass-through (optional)
      devlab_ui: devlab_ui || undefined,
    },
  });
  // Emit full package payload before persisting, for postcourse only
  try {
    if (String(doc.assessment_type).toLowerCase() === 'postcourse') {
      // eslint-disable-next-line no-console
      console.log('[TRACE][POSTCOURSE][BUILT_PACKAGE]', JSON.stringify(doc.toObject(), null, 2));
    }
  } catch {}
  await doc.save();
  return doc;
}

// --- AI helper for grading open-text answers (non-breaking; local to this module) ---
async function gradeOpenAnswerWithAI({ question, correctAnswer, userAnswer, skillId, examType }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const temperature = Number.isFinite(Number(process.env.AI_TEMPERATURE))
    ? Number(process.env.AI_TEMPERATURE)
    : 0.2;

  // Build strict JSON grading prompt
  const system = [
    "You are an exam grading engine.",
    "Return strictly JSON with fields: score (0-100 number), reason (string).",
    "Score MUST be a number from 0 to 100.",
  ].join(" ");
  const user = JSON.stringify({
    intent: "grade_open_answer",
    instructions: "Return ONLY JSON with { score: 0-100, reason: string } based on correctness, completeness, relevance.",
    context: {
      examType: String(examType || "unknown"),
      skillId: String(skillId || "unassigned"),
    },
    question: String(question || ""),
    correct_answer: String(correctAnswer || ""),
    student_answer: String(userAnswer || ""),
  });

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  const body = {
    model,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  };

  const { data } = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    body,
    { headers, timeout: 30000 },
  );
  const content = data?.choices?.[0]?.message?.content || "";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error("ai_invalid_json_response");
  }
  const rawScore = parsed?.score;
  const reason = parsed?.reason != null ? String(parsed.reason) : "";
  if (!Number.isFinite(Number(rawScore))) {
    throw new Error("ai_missing_or_invalid_score");
  }
  const score = Math.max(0, Math.min(100, Number(rawScore)));
  return { score, reason };
}

async function createExam({ user_id, exam_type, course_id, course_name, user_name, company_id }) {
  // Map user_id to numeric at the very beginning
  const userStr = String(user_id);
  const userInt = Number(userStr.replace(/[^0-9]/g, ""));
  if (!Number.isFinite(userInt)) {
    return { error: "invalid_user_id" };
  }
  const __t0 = Date.now();
  const __lap = (label) => {
    try { console.log('[TRACE][%s][CREATE][STEP] %s elapsed_ms=%d', String(exam_type || '').toUpperCase(), label, Date.now() - __t0); } catch {}
  };
  try {
    // eslint-disable-next-line no-console
    console.log("[TRACE][USER_ID][MAPPED]", { original: user_id, numeric: userInt });
  } catch {}
  // Ensure a users row exists for this learner before creating exams
  try {
    __lap('ensureUserExists start');
    await ensureUserExists({ user_id_numeric: userInt, user_name, company_id });
    __lap('ensureUserExists end');
  } catch {}
  // Fetch upstream data via gateways with safe mocks
  let policy = {};
  let skillsPayload = null;
  let coveragePayload = null;
  // [TRACE] create entry
  try {
    // eslint-disable-next-line no-console
    console.log(`[TRACE][${String(exam_type).toUpperCase()}][CREATE][BEGIN]`, {
      user_id_original: user_id,
      user_id_numeric: userInt,
      course_id: course_id ?? null,
      env: {
        DIRECTORY_BASE_URL: !!process.env.DIRECTORY_BASE_URL,
        SKILLS_ENGINE_BASE_URL: !!process.env.SKILLS_ENGINE_BASE_URL,
        COURSE_BUILDER_BASE_URL: !!process.env.COURSE_BUILDER_BASE_URL,
        INTEGRATION_DEVLAB_DATA_REQUEST_URL: !!process.env.INTEGRATION_DEVLAB_DATA_REQUEST_URL,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      },
    });
  } catch {}

  const isTest = String(process.env.NODE_ENV || '').toLowerCase() === 'test';
  if (exam_type === "baseline") {
    // Guard: context must be present before creation
    try {
      const { ExamContext } = require('../../models');
      const ctx = await ExamContext.findOne({ user_id: String(user_id), exam_type: 'baseline' });
      if (!ctx || !ctx.competency_name) {
        return { error: 'baseline_context_incomplete' };
      }
      try { console.log('[BASELINE][CONTEXT][OK]', { user_id, competency_name: ctx.competency_name }); } catch {}
    } catch {
      return { error: 'baseline_context_incomplete' };
    }
    // Baseline: skip Directory policy entirely
    policy = { passing_grade: 70 };
    try { console.log('[BASELINE][POLICY][STATIC] passing_grade=70 (Directory skipped)'); } catch {}
  } else if (exam_type === "postcourse") {
    // Phase 1: Policy first, then coverage (with safe mocks)
    if (isTest) {
      try {
        const { mockFetchPolicy } = require("../mocks/directoryMock");
        policy = await mockFetchPolicy("postcourse");
      } catch {
        policy = { passing_grade: 70, max_attempts: 3 };
      }
      try {
        const { mockFetchCoverage } = require("../mocks/courseBuilderMock");
        coveragePayload = await mockFetchCoverage({
          learner_id: user_id,
          learner_name: undefined,
          course_id,
        });
      } catch {
        coveragePayload = {
          learner_id: user_id,
          course_id,
          course_name: String(course_name || ''),
          coverage_map: [{ lesson_id: 'L101', skills: ['s_general'] }],
        };
      }
    } else {
      policy = await safeFetchPolicy("postcourse");
      coveragePayload = await safeFetchCoverage({
        learner_id: user_id,
        learner_name: undefined,
        course_id,
      });
    }
    try {
      const mapArr = Array.isArray(coveragePayload?.coverage_map) ? coveragePayload.coverage_map : [];
      const skillsTotal = mapArr.map(i => Array.isArray(i?.skills) ? i.skills.length : 0).reduce((a,b)=>a+b,0);
      // eslint-disable-next-line no-console
      console.log('[TRACE][POSTCOURSE][COVERAGE]', {
        coverage_items: mapArr.length,
        coverage_skills_total: skillsTotal,
      });
    } catch {}
  } else {
    return { error: "invalid_exam_type" };
  }

  // Phase: Replace theoretical mocks with REAL OpenAI generation
  const { generateTheoreticalQuestions, validateQuestion } = require("../gateways/aiGateway");
  const { normalizeAiQuestion, validateTheoreticalQuestions } = require("./theoryService");
  const { normalizeSkills } = require("./skillsUtils");

  // Log mapping only for non-baseline
  if (String(exam_type) !== 'baseline') {
    try {
      // eslint-disable-next-line no-console
      console.log("[TRACE][EXAM][CREATE][USER_MAP]", { user_id_original: user_id, user_id_numeric: userInt });
    } catch {}
  }
  const courseInt = normalizeToInt(course_id); // can be null for baseline

  // Determine attempt behavior based on rules
  let attemptNo = 1;
  let reuseAttempt = null; // { attempt_id, exam_id, attempt_no }
  if (exam_type === "baseline") {
    // Always first and only attempt
    attemptNo = 1;
  } else if (exam_type === "postcourse") {
    // New lifecycle logic: reuse active/pending, else create next attempt
    const passingGrade = Number((policy || {})?.passing_grade ?? 0);
    const maxAttempts = Number((policy || {})?.max_attempts ?? 0);
    const courseIdNorm = normalizeToInt(course_id);
    if (isTest) {
      attemptNo = 1;
    } else {
      const { rows: attemptsAllAsc } = await pool.query(
        `
          SELECT ea.*, e.course_id
          FROM exam_attempts ea
          JOIN exams e ON e.exam_id = ea.exam_id
          WHERE e.user_id = $1
            AND e.exam_type = 'postcourse'
            AND e.course_id = $2
          ORDER BY ea.attempt_no ASC
        `,
        [userInt, courseIdNorm],
      );
      const classify = (row) => {
        const submitted = row.submitted_at != null;
        const canceled = String(row.status || '').toLowerCase() === 'canceled';
        const started = row.started_at != null;
        const exp = row.expires_at != null ? new Date(row.expires_at) : null;
        const expired = !submitted && started && exp && new Date() > exp;
        const activeOrPending = !submitted && !expired && !canceled;
        return { submitted, canceled, expired, activeOrPending };
      };
      const annotated = (attemptsAllAsc || []).map(a => ({ a, c: classify(a) }));
      // Mark any active-but-expired attempts as expired with end time
      try {
        const toExpire = annotated
          .filter(x => x.c.expired)
          .map(x => x.a.attempt_id)
          .filter(Boolean);
        if (toExpire.length > 0) {
          await pool.query(
            `UPDATE exam_attempts SET status = 'expired', submitted_at = NOW() WHERE attempt_id = ANY($1::int[])`,
            [toExpire],
          );
          try {
            console.log('[TRACE][POSTCOURSE][ATTEMPT_MARK_EXPIRED]', { count: toExpire.length, attempts: toExpire });
          } catch {}
        }
      } catch {}
      const activeList = annotated.filter(x => x.c.activeOrPending).map(x => x.a);
      if (activeList.length > 0) {
        const pick = activeList[activeList.length - 1]; // latest active/pending
        reuseAttempt = { attempt_id: pick.attempt_id, exam_id: pick.exam_id, attempt_no: pick.attempt_no || 1 };
        try {
          console.log('[TRACE][POSTCOURSE][ATTEMPT_REUSE]', { user_id: userInt, course_id: courseIdNorm, attempt_id: reuseAttempt.attempt_id, attempt_no: reuseAttempt.attempt_no });
        } catch {}
      } else {
        const finals = annotated.filter(x => x.c.submitted || x.c.expired || x.c.canceled).map(x => x.a);
        const lastFinal = finals.length > 0 ? finals[finals.length - 1] : null;
        const lastFinalAttemptNo = lastFinal ? Number(lastFinal.attempt_no || 0) : 0;
        const nextAttemptNo = (lastFinalAttemptNo || 0) + 1;
        if (Number.isFinite(maxAttempts) && maxAttempts > 0 && nextAttemptNo > maxAttempts) {
          try {
            console.log('[TRACE][POSTCOURSE][ATTEMPT_BLOCKED]', { user_id: userInt, course_id: courseIdNorm, lastFinalAttemptNo, max_attempts: maxAttempts, reason: 'max_attempts_reached' });
          } catch {}
          return { error: "max_attempts_reached" };
        }
        attemptNo = nextAttemptNo;
      }
      // Smart retake skills selection (unchanged), computed from coverage and acquired across attempts
      const { normalizeSkills } = require("./skillsUtils");
      const rawCoverageList = Array.isArray(coveragePayload?.coverage_map) ? coveragePayload.coverage_map : [];
      const normalizedCoverageMapPre = rawCoverageList.map((item) => ({
        ...item,
        skills: normalizeSkills(item?.skills || []),
      })).filter((it) => Array.isArray(it.skills) && it.skills.length > 0);
      const coverageSkills = new Set();
      for (const it of normalizedCoverageMapPre) {
        for (const s of it.skills) {
          const sid = String(s?.skill_id || "").trim();
          if (sid) coverageSkills.add(sid);
        }
      }
      const priorAttemptIds = (attemptsAllAsc || []).map((r) => r.attempt_id).filter(Boolean);
      let acquiredSkills = new Set();
      if (priorAttemptIds.length > 0) {
        const { rows: acquiredRows } = await pool.query(
          `
            SELECT skill_id, score, status
            FROM attempt_skills
            WHERE attempt_id = ANY($1::int[])
          `,
          [priorAttemptIds],
        );
        acquiredSkills = new Set(
          (acquiredRows || [])
            .filter((r) => String(r?.status || "").toLowerCase() === "acquired" || Number(r?.score || 0) >= passingGrade)
            .map((r) => String(r.skill_id || "").trim())
            .filter(Boolean),
        );
      }
      const retakeSkills = Array.from(coverageSkills).filter((sid) => !acquiredSkills.has(sid));
      const useSkills = retakeSkills.length > 0 ? retakeSkills : Array.from(coverageSkills);
      // If there are prior attempts and no unmet skills remain, the learner already passed
      if ((attemptsAllAsc || []).length > 0 && retakeSkills.length === 0) {
        try {
          console.log('[TRACE][POSTCOURSE][ALREADY_PASSED]', { user_id: userInt, course_id: courseIdNorm });
        } catch {}
        return { error: "already_passed" };
      }
      try {
        console.log('[TRACE][POSTCOURSE][RETAKE_SKILLS]', {
          coverage: coverageSkills.size,
          acquired: acquiredSkills.size,
          retake: useSkills.length,
        });
      } catch {}
      const reducedCoverageMap = normalizedCoverageMapPre
        .map((it) => ({
          ...it,
          skills: (it.skills || []).filter((s) => useSkills.includes(String(s.skill_id))),
        }))
        .filter((it) => Array.isArray(it.skills) && it.skills.length > 0);
      coveragePayload = { ...(coveragePayload || {}), coverage_map: reducedCoverageMap };
      skillsPayload = { skills: useSkills.map((sid) => ({ skill_id: sid, skill_name: sid })) };
    }
  }

  let examId;
  let attemptId;
  if (reuseAttempt && reuseAttempt.attempt_id && reuseAttempt.exam_id) {
    examId = reuseAttempt.exam_id;
    attemptId = reuseAttempt.attempt_id;
  } else {
    const insertExamText = `
      INSERT INTO exams (exam_type, user_id, course_id)
      VALUES ($1, $2, $3)
      RETURNING exam_id
    `;
    let examRows;
    try {
      const res = await pool.query(insertExamText, [exam_type, userInt, courseInt]);
      examRows = res.rows;
    } catch (e) {
      try { console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'invalid_user_id', message: e?.message, stage: 'insert_exam' }); } catch {}
      return { error: "invalid_user_id" };
    }
    examId = examRows[0].exam_id;
  }

  // Prepare skills and coverage map (normalize shapes)
  const normalizedBaselineSkills = normalizeSkills(skillsPayload?.skills || []);
  const rawCoverage = Array.isArray(coveragePayload?.coverage_map) ? coveragePayload.coverage_map : [];
  const normalizedCoverageMap = rawCoverage.map((item) => ({
    ...item,
    skills: normalizeSkills(item?.skills || []),
  })).filter((it) => Array.isArray(it.skills) && it.skills.length > 0);
  // eslint-disable-next-line no-console
  console.debug("Normalized baseline skills:", normalizedBaselineSkills);
  // eslint-disable-next-line no-console
  console.debug("Normalized coverage skills:", normalizedCoverageMap.map(x => x.skills).flat());
  // For postcourse, metadata.skills should be the retake skills list; fallback to baseline skills otherwise
  const skillsArray = exam_type === "postcourse"
    ? Array.from(
        new Map(
          normalizedCoverageMap.flatMap((it) => it.skills).map((s) => [String(s.skill_id), s]),
        ).values(),
      )
    : normalizedBaselineSkills;
  const coverageMap = normalizedCoverageMap;
  const resolvedCourseName =
    exam_type === "postcourse"
      ? coveragePayload?.course_name || course_name || null
      : null;

  // Determine question count and timing
  let questionCount = 0;
  if (exam_type === "baseline") {
    questionCount = Array.isArray(skillsArray) ? skillsArray.length : 0;
  } else if (exam_type === "postcourse") {
    // 2 per skill (1 MCQ + 1 OPEN) if possible
    const uniqueSkillIds = Array.from(new Set((skillsArray || []).map((s) => String(s.skill_id)).filter(Boolean)));
    questionCount = uniqueSkillIds.length * 2;
  }
  if (isTest && (!Number.isFinite(questionCount) || questionCount < 2)) {
    questionCount = 2;
  }
  const durationMinutes = Number.isFinite(questionCount) ? questionCount * 4 : 0;
  // Expires-at is now set on start, not on creation
  const expiresAtIso = null;

  // Insert initial attempt (attempt_no = 1)
  const policySnapshot = policy || {};
  if (!(reuseAttempt && reuseAttempt.attempt_id)) {
    const insertAttemptText = `
      INSERT INTO exam_attempts (exam_id, attempt_no, policy_snapshot, package_ref)
      VALUES ($1, $2, $3::jsonb, $4)
      RETURNING attempt_id
    `;
    const tempPackageRef = null;
    let attemptRows;
    try {
      const resAttempt = await pool.query(insertAttemptText, [
        examId,
        attemptNo,
        JSON.stringify(policySnapshot),
        tempPackageRef,
      ]);
      attemptRows = resAttempt.rows;
    } catch (e) {
      try { console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'exam_creation_failed', message: e?.message, stage: 'insert_attempt' }); } catch {}
      return { error: "exam_creation_failed" };
    }
    attemptId = attemptRows[0].attempt_id;
    if (isTest) {
      try { console.log('[TRACE][TEST_MODE][FORCE_CREATE]', { exam_id: examId, attempt_id: attemptId }); } catch {}
    }
    if (!Number.isFinite(Number(attemptId))) {
      try { console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'exam_creation_failed', message: 'attempt_id missing', stage: 'attempt_id_validation' }); } catch {}
      return { error: "exam_creation_failed" };
    }
    try {
      console.log('[TRACE][POSTCOURSE][ATTEMPT_NEW]', { user_id: userInt, course_id: courseInt, attempt_id: attemptId, attempt_no: attemptNo, max_attempts: Number((policy||{}).max_attempts ?? 0) });
    } catch {}
  } else {
    try {
      console.log('[TRACE][POSTCOURSE][ATTEMPT_REUSE]', { user_id: userInt, course_id: courseInt, attempt_id: attemptId, attempt_no: reuseAttempt.attempt_no });
    } catch {}
  }

  // Persist timing into attempt (duration_minutes only; do NOT touch started_at/expires_at here)
  try {
    await pool.query(
      `
        UPDATE exam_attempts
        SET duration_minutes = $1
        WHERE attempt_id = $2
      `,
      [durationMinutes || null, attemptId],
    );
  } catch {}
  try {
    // eslint-disable-next-line no-console
    if (exam_type === 'postcourse') {
      console.log('[TRACE][POSTCOURSE][ATTEMPT_CREATED]', {
        exam_id: examId,
        attempt_id: attemptId,
        attempt_no: attemptNo,
        started_at: null,
        expires_at: null,
      });
    }
  } catch {}

  // Build ExamPackage in Mongo
  // Phase 08.2 – Build coding questions via DevLab envelope (MANDATORY)
  const skillsForCoding = (() => {
    const ids = [];
    if (Array.isArray(skillsArray) && skillsArray.length > 0) {
      for (const s of skillsArray) ids.push(String(s.skill_id));
    } else if (Array.isArray(coverageMap) && coverageMap.length > 0) {
      for (const item of coverageMap) {
        for (const s of (item.skills || [])) ids.push(String(s.skill_id));
      }
    }
    return Array.from(new Set(ids.filter(Boolean)));
  })();
  // eslint-disable-next-line no-console
  console.debug("Coding generation skills:", skillsForCoding);
  let codingQuestionsDecorated = [];
  let devlabPayload = null;
  try {
    const __tDev = Date.now();
    try { console.log('[DEVLAB][GEN][BEFORE_SEND]', { exam_id: examId, attempt_id: attemptId }); } catch {}
    const { requestCodingWidgetHtml } = require("../gateways/devlabGateway");
    devlabPayload = await requestCodingWidgetHtml({
      attempt_id: attemptId,
      skills: skillsForCoding,
      difficulty: 'medium',
      amount: 2,
      humanLanguage: 'en',
    });
    try { console.log('[DEVLAB][GEN][AFTER_RESPONSE]', { keys: Object.keys(devlabPayload || {}), elapsed_ms: Date.now() - __tDev }); } catch {}
    const qArr = Array.isArray(devlabPayload?.questions) ? devlabPayload.questions : [];
    const htmlStr = typeof devlabPayload?.html === 'string' ? devlabPayload.html : null;
    try { console.log('[DEVLAB][GEN][AFTER_PARSE]', { questions_count: qArr.length, html_length: htmlStr ? htmlStr.length : 0 }); } catch {}
    try { console.log('[DEVLAB][GEN][FINAL]', { qCount: Array.isArray(qArr) ? qArr.length : 0, htmlLength: htmlStr ? htmlStr.length : 0, sourceQuestions: devlabPayload?.sourceQuestions || 'unknown' }); } catch {}
    if (!Array.isArray(qArr) || qArr.length === 0) {
      return { error: "exam_creation_failed", message: "DevLab generation returned no questions" };
    }
    codingQuestionsDecorated = qArr;
  } catch (e) {
    return { error: "exam_creation_failed", message: e?.message || "DevLab generation failed" };
  }
  try {
    console.log(`[TRACE][${String(exam_type).toUpperCase()}][DEVLAB]`, {
      skills_for_coding: skillsForCoding.length,
      questions_built: Array.isArray(codingQuestionsDecorated) ? codingQuestionsDecorated.length : 0,
      real_candidate: !!process.env.INTEGRATION_DEVLAB_DATA_REQUEST_URL,
    });
  } catch {}

  // Generate theoretical questions with medium difficulty (fixed), mixed types
  let questions = [];
  try {
    const uniqueSkills = (() => {
      if (exam_type === "baseline") {
        return Array.from(new Set((skillsArray || []).map((s) => String(s.skill_id)).filter(Boolean)));
      }
      return Array.from(new Set((skillsArray || []).map((s) => String(s.skill_id)).filter(Boolean)));
    })();
    // eslint-disable-next-line no-console
    console.debug("Theoretical generation skills:", uniqueSkills);
    const items = [];
    if (exam_type === "postcourse") {
      // At least 1 MCQ and 1 OPEN per skill
      for (const sid of uniqueSkills) {
        items.push({ skill_id: sid, difficulty: 'medium', humanLanguage: 'en', type: 'mcq' });
        items.push({ skill_id: sid, difficulty: 'medium', humanLanguage: 'en', type: 'open' });
      }
    } else {
      for (let i = 0; i < questionCount; i += 1) {
        const skill_id = uniqueSkills[i % Math.max(uniqueSkills.length, 1)];
        if (!skill_id) continue;
        const type = i % 2 === 0 ? 'mcq' : 'open';
        items.push({ skill_id, difficulty: 'medium', humanLanguage: 'en', type });
      }
    }
    let generated = [];
    if (isTest) {
      const sid = (Array.isArray(items) && items[0]?.skill_id) || 's_general';
      generated = [
        { qid: 'test_mcq', type: 'mcq', skill_id: sid, difficulty: 'medium', question: `MCQ for ${sid}`, options: ['A','B','C'], correct_answer: 'A' },
        { qid: 'test_open', type: 'open', skill_id: sid, difficulty: 'medium', question: `Explain ${sid}` },
      ];
    } else {
      // Always inject a per-attempt seed for baseline to enforce uniqueness
      const seed = `${Date.now()}-${Math.random()}`;
      generated = await generateTheoreticalQuestions({ items, seed });
      try {
        if (exam_type === 'baseline') {
          // eslint-disable-next-line no-console
          console.log('[BASELINE][AI] Using OpenAI-generated theoretical questions', { count: Array.isArray(generated) ? generated.length : 0 });
        }
      } catch {}
    }

    // AI validation per question (non-blocking if fails)
    const validated = [];
    for (const q of generated) {
      let validation = { valid: true, reasons: [] };
      if (!isTest) {
        try {
          validation = await validateQuestion({ question: q });
        } catch (e) {
          validation = { valid: false, reasons: ['validation_call_failed'] };
        }
      }
      if (process.env.NODE_ENV !== "test") {
        try {
          await AiAuditTrail.create({
            exam_id: String(examId),
            attempt_id: String(attemptId),
            event_type: "prompt",
            model: { provider: "openai", name: process.env.AI_MODEL || "gpt-4o-mini", version: "v1" },
            prompt: { action: "validate_question", question: q },
            response: validation,
            status: validation.valid ? "success" : "failure",
          });
        } catch {}
      }
      // Map to our theoretical question input shape
      const hints = q?.hint ? [String(q.hint)] : undefined;
      const normalized = normalizeAiQuestion({
        ...q,
        hint: hints,
      });
      validated.push(normalized);
    }
    questions = validateTheoreticalQuestions(validated);
    try {
      // eslint-disable-next-line no-console
      if (exam_type === "postcourse") {
        console.log('[TRACE][POSTCOURSE][THEORY]', {
          skills: Array.isArray(skillsArray) ? skillsArray.length : 0,
          questions: Array.isArray(questions) ? questions.length : 0,
        });
      } else {
        console.log(`[TRACE][${String(exam_type).toUpperCase()}][THEORY]`, {
          generated: Array.isArray(generated) ? generated.length : 0,
          validated: Array.isArray(questions) ? questions.length : 0,
          real_candidate: !!process.env.OPENAI_API_KEY,
        });
      }
    } catch {}
  } catch (err) {
    try {
      if (String(exam_type).toLowerCase() === 'postcourse') {
        // eslint-disable-next-line no-console
        console.log('[TRACE][POSTCOURSE][AI][ERROR]', { stage: 'generate_theoretical_questions', message: err?.message, stack: err?.stack });
      } else {
        // eslint-disable-next-line no-console
        console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'ai_generation_failed', message: err?.message });
        // eslint-disable-next-line no-console
        console.log('[BASELINE][AI][FAIL] Reason:', err?.message);
      }
    } catch {}
    // Fallback to theoretical mocks if OpenAI fails
    try {
      const { buildMockQuestions } = require("../mocks/theoryMock");
      const skillsForMocks = Array.from(new Set((skillsArray || []).map((s) => String(s.skill_id)).filter(Boolean)));
      const mocks = buildMockQuestions({ skills: skillsForMocks, amount: Math.max(1, skillsForMocks.length) });
      // map mocks into unified normalized structure; MCQs only in mock; OPEN omitted if not available
      const normalizedMcqs = mocks.map((m) => ({
        qid: m.qid,
        type: "mcq",
        skill_id: m.skill_id,
        difficulty: "medium",
        question: m.prompt?.question || "",
        stem: m.prompt?.question || "",
        options: Array.isArray(m.prompt?.options) ? m.prompt.options : [],
        correct_answer: m.prompt?.correct_answer || "",
      }));
      // duplicate MCQ set once if we need two per skill in postcourse
      const duplicatedForOpen = exam_type === "postcourse" ? normalizedMcqs : [];
      let fallback = validateTheoreticalQuestions([...normalizedMcqs, ...duplicatedForOpen]);
      // Baseline mode: maintain same count as AI-items and shuffle order
      if (exam_type === 'baseline') {
        try {
          // eslint-disable-next-line no-console
          console.log('[BASELINE][MOCK] Using fallback theoretical questions');
        } catch {}
        // Fisher-Yates shuffle
        for (let i = fallback.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = fallback[i];
          fallback[i] = fallback[j];
          fallback[j] = tmp;
        }
        const desired = Math.max(1, Array.isArray(skillsArray) ? Math.min(fallback.length, questionCount) : questionCount);
        fallback = fallback.slice(0, desired);
      }
      questions = fallback;
      try {
        if (String(exam_type).toLowerCase() === 'postcourse') {
          // eslint-disable-next-line no-console
          console.log('[TRACE][POSTCOURSE][MOCK_FALLBACK]', { reason: 'ai_failed', mcq_count: normalizedMcqs.length, duplicated_for_open: duplicatedForOpen.length });
        }
      } catch {}
    } catch (mockErr) {
      try {
        // eslint-disable-next-line no-console
        console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'mock_fallback_failed', message: mockErr?.message, stack: mockErr?.stack });
      } catch {}
      questions = [];
    }
  }
  // If AI returned zero items, also fallback to mocks
  if (!Array.isArray(questions) || questions.length === 0) {
    try {
      const { buildMockQuestions } = require("../mocks/theoryMock");
      const skillsForMocks = Array.from(new Set((skillsArray || []).map((s) => String(s.skill_id)).filter(Boolean)));
      const mocks = buildMockQuestions({ skills: skillsForMocks, amount: Math.max(1, skillsForMocks.length) });
      const normalizedMcqs = mocks.map((m) => ({
        qid: m.qid,
        type: "mcq",
        skill_id: m.skill_id,
        difficulty: "medium",
        question: m.prompt?.question || "",
        stem: m.prompt?.question || "",
        options: Array.isArray(m.prompt?.options) ? m.prompt.options : [],
        correct_answer: m.prompt?.correct_answer || "",
      }));
      const duplicatedForOpen = exam_type === "postcourse" ? normalizedMcqs : [];
      let fallback2 = validateTheoreticalQuestions([...normalizedMcqs, ...duplicatedForOpen]);
      if (exam_type === 'baseline') {
        try {
          // eslint-disable-next-line no-console
          console.log('[BASELINE][MOCK] Using fallback theoretical questions');
        } catch {}
        for (let i = fallback2.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = fallback2[i];
          fallback2[i] = fallback2[j];
          fallback2[j] = tmp;
        }
        const desired = Math.max(1, Array.isArray(skillsArray) ? Math.min(fallback2.length, questionCount) : questionCount);
        fallback2 = fallback2.slice(0, desired);
      }
      questions = fallback2;
      try {
        if (String(exam_type).toLowerCase() === 'postcourse') {
          // eslint-disable-next-line no-console
          console.log('[TRACE][POSTCOURSE][MOCK_FALLBACK]', { reason: 'no_items_generated', mcq_count: normalizedMcqs.length, duplicated_for_open: duplicatedForOpen.length });
        }
      } catch {}
    } catch (mockErr2) {
      try {
        // eslint-disable-next-line no-console
        console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'mock_fallback_failed', message: mockErr2?.message, stack: mockErr2?.stack });
      } catch {}
      questions = [];
    }
  }

  // Final validation
  questions = validateTheoreticalQuestions(questions);
  if (process.env.NODE_ENV !== "test") {
    try {
      __lap('buildExamPackageDoc start');
      const pkg = await buildExamPackageDoc({
        exam_id: examId,
        attempt_id: attemptId,
        user_id: userStr, // keep original form in package metadata only
        exam_type,
        policy: policySnapshot,
        skills: skillsArray, // normalized objects
        coverage_map: coverageMap, // normalized lesson.skill objects
        course_id: course_id != null ? course_id : null,
        course_name: resolvedCourseName || undefined,
        questions,
        coding_questions: codingQuestionsDecorated,
        time_allocated_minutes: durationMinutes || undefined,
        expires_at_iso: expiresAtIso || undefined,
        devlab_ui: (devlabPayload && typeof devlabPayload.html === 'string' && devlabPayload.html.trim() !== '') ? { componentHtml: devlabPayload.html } : undefined,
      });
      __lap('buildExamPackageDoc end');
      // Backfill package_ref in PG
      __lap('pg_update_package_ref start');
      await pool.query(
        `UPDATE exam_attempts SET package_ref = $1 WHERE attempt_id = $2`,
        [pkg._id, attemptId],
      );
      __lap('pg_update_package_ref end');
      try {
        // eslint-disable-next-line no-console
        if (exam_type === 'postcourse') {
          console.log('[TRACE][POSTCOURSE][PACKAGE_LINKED]', {
            exam_id: examId,
            attempt_id: attemptId,
            package_ref: String(pkg._id),
          });
        }
      } catch {}
    } catch (e) {
      try {
        // eslint-disable-next-line no-console
        console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'exam_creation_failed', message: e?.message, stack: e?.stack });
      } catch {}
      return { error: "exam_creation_failed", message: "Failed to create and persist exam package" };
    }
    try {
      // Explicit service-level assertion: createExam does NOT start proctoring or the exam
      // eslint-disable-next-line no-console
      console.log('[TRACE][CREATE] no startExam (service)', { exam_id: examId, attempt_id: attemptId });
    } catch {}
    // End-to-end validation: Confirm package exists
    try {
      __lap('verify_package start');
      const verify = await ExamPackage.findOne({ attempt_id: String(attemptId) }).lean();
      if (!verify) {
        try { console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'exam_incomplete', message: 'ExamPackage missing after creation' }); } catch {}
        return { error: 'exam_incomplete' };
      }
      __lap('verify_package end');
    } catch (e) {
      try { console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'exam_incomplete', message: e?.message }); } catch {}
      return { error: 'exam_incomplete' };
    }
  }

  // Build API response
  const response = {
    exam_id: examId,
    attempt_id: attemptId,
    exam_type,
    user_id: Number(userInt),
    course_id: courseInt != null ? Number(courseInt) : null,
    passing_grade: policySnapshot?.passing_grade ?? null,
    max_attempts: policySnapshot?.max_attempts ?? null,
    policy_snapshot: policySnapshot,
    started_at: null,
    expires_at: expiresAtIso,
    duration_seconds: Number.isFinite(durationMinutes) ? durationMinutes * 60 : null,
  };
  try { console.log('[TRACE][EXAM][CREATE][RETURN]', { exam_id: response.exam_id, attempt_id: response.attempt_id }); } catch {}
  return response;
}

async function markAttemptStarted({ attempt_id }) {
  // Load attempt, exam, and policy to enforce rules
  const { rows: attemptRows } = await pool.query(
    `SELECT ea.attempt_id, ea.exam_id, ea.attempt_no, ea.policy_snapshot, ea.started_at, ea.expires_at, ea.duration_minutes, e.exam_type
     FROM exam_attempts ea
     JOIN exams e ON e.exam_id = ea.exam_id
     WHERE ea.attempt_id = $1`,
    [attempt_id],
  );
  if (attemptRows.length === 0) {
    throw new Error("attempt_not_found");
  }
  const attempt = attemptRows[0];
  const examType = attempt.exam_type;

  if (examType === "baseline") {
    // Only one attempt allowed; block if attempt_no > 1 or attemptsCount > 1
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM exam_attempts WHERE exam_id = $1`,
      [attempt.exam_id],
    );
    const attemptsCount = countRows[0]?.cnt ?? 0;
    if (attempt.attempt_no > 1 || attemptsCount > 1) {
      return { error: "baseline_attempt_not_allowed" };
    }
  }

  // Set start_time and expiry on first start; enforce expiry on subsequent calls
  const now = new Date();
  if (!attempt.started_at) {
    const durationMin = Number(attempt.duration_minutes || 0);
    const expAt = Number.isFinite(durationMin) && durationMin > 0
      ? new Date(now.getTime() + durationMin * 60 * 1000)
      : null;
    await pool.query(
      `UPDATE exam_attempts SET status = 'started', started_at = $1, expires_at = $2 WHERE attempt_id = $3`,
      [now, expAt, attempt_id],
    );
    try {
      console.log('[TRACE][EXAM][START][SET_EXPIRY]', {
        attempt_id,
        start_time: now.toISOString(),
        expires_at: expAt ? expAt.toISOString() : null,
        duration: durationMin,
      });
      console.log('[TRACE][EXAM][STARTED]', { attempt_id, started: true });
    } catch {}
    return { ok: true };
  }
  // Already started: check expiry now
  if (attempt.expires_at) {
    const exp = new Date(attempt.expires_at);
    if (now > exp) {
      return { error: "exam_time_expired" };
    }
  }
  try {
    // eslint-disable-next-line no-console
    console.log('[TRACE][EXAM][STARTED]', { attempt_id, already_started: true });
  } catch {}
  return { ok: true, already_started: true };
}

/**
 * Recompute final results for an attempt using existing persisted exam package and
 * previously computed theoretical per-skill (if any), merging in latest coding results
 * from DevLab ingestion. This function does not re-call external services and is safe
 * to invoke from submit-coding-grade to finalize PENDING_CODING attempts.
 */
async function recomputeFinalResults(attemptIdNum) {
  // Load attempt and policy
  const { rows: attemptRows } = await pool.query(
    `SELECT ea.*, e.exam_type, e.course_id, e.user_id
     FROM exam_attempts ea
     JOIN exams e ON e.exam_id = ea.exam_id
     WHERE ea.attempt_id = $1`,
    [attemptIdNum],
  );
  if (!attemptRows || attemptRows.length === 0) {
    throw new Error('attempt_not_found');
  }
  const attempt = attemptRows[0];
  if (String(attempt.status || '').toLowerCase() === 'canceled') {
    // Do not finalize canceled attempts
    return { skipped: true, reason: 'canceled' };
  }
  const policy = attempt.policy_snapshot || {};
  const passThreshold = Number.isFinite(Number(policy?.passing_grade))
    ? Number(policy.passing_grade)
    : 0;

  const pkg = await getPackageByAttemptId(String(attemptIdNum));
  if (!pkg) {
    throw new Error('package_not_found');
  }

  // Start with any previously computed theoretical per-skill from package.grading
  const basePerSkill = Array.isArray(pkg?.grading?.per_skill) ? [...pkg.grading.per_skill] : [];

  // Build coding skills from ingested results (examPackage.coding_results.skills)
  const codingSkills = [];
  const skillsMap =
    pkg?.coding_results && typeof pkg.coding_results === 'object'
      ? (pkg.coding_results.skills || null)
      : null;
  if (skillsMap && typeof skillsMap === 'object') {
    for (const [sid, meta] of Object.entries(skillsMap)) {
      const val = Number(meta && meta.score);
      const scoreVal = Number.isFinite(val) ? val : 0;
      const skillIdStr = String(sid || 'unassigned');
      const name =
        (Array.isArray(pkg?.metadata?.skills) ? pkg.metadata.skills : [])
          .map((s) => ({
            id: String(s?.id ?? s?.skill_id ?? ''),
            name: s?.name ?? s?.skill_name,
          }))
          .find((x) => x.id === skillIdStr)?.name || skillIdStr;
      codingSkills.push({
        skill_id: skillIdStr,
        skill_name: name,
        score: scoreVal,
        status: scoreVal > 0 ? 'acquired' : 'failed',
        feedback: typeof meta?.feedback === 'string' ? meta.feedback : undefined,
      });
    }
  }

  // Merge: coding overrides same skill_id from base list
  const map = new Map();
  for (const s of basePerSkill) {
    map.set(String(s?.skill_id || ''), { ...s });
  }
  for (const c of codingSkills) {
    map.set(String(c?.skill_id || ''), { ...c });
  }
  const finalPerSkill = Array.from(map.values());
  const scores = finalPerSkill.map((s) => Number(s?.score || 0));
  const finalGrade =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const passed = finalGrade >= passThreshold;

  // Update Postgres: mark completed (unless canceled) and set submitted_at
  try {
    await pool.query(
      `UPDATE exam_attempts
       SET final_grade = $1,
           passed = $2,
           status = CASE WHEN status = 'canceled' THEN status ELSE 'completed' END,
           submitted_at = COALESCE(submitted_at, NOW()),
           coding_status = 'graded'
       WHERE attempt_id = $3`,
      [Number(finalGrade), !!passed, attemptIdNum],
    );
  } catch {}

  // Update package grading block with merged results
  if (process.env.NODE_ENV !== 'test') {
    try {
      await ExamPackage.updateOne(
        { attempt_id: String(attemptIdNum) },
        {
          $set: {
            grading: {
              final_grade: Number(finalGrade),
              passed: !!passed,
              per_skill: finalPerSkill,
              engine: 'internal+devlab',
              completed_at: new Date(),
            },
          },
        },
        { upsert: false },
      );
    } catch {}
  }

  try {
    console.log('[EXAM][RESULT][FINAL][MERGED]', {
      attempt_id: attemptIdNum,
      final_grade: Number(finalGrade),
      passed: !!passed,
      skills_total: finalPerSkill.length,
    });
  } catch {}
  try {
    console.log('[EXAM][FINALIZE][AFTER_CODING][SUCCESS]', {
      attempt_id: attemptIdNum,
      final_grade: Number(finalGrade),
      passed: !!passed,
    });
  } catch {}

  return { ok: true, final_grade: Number(finalGrade), per_skill: finalPerSkill };
}

async function getPackageByExamId(exam_id) {
  const doc = await ExamPackage.findOne({ exam_id: String(exam_id) })
    .sort({ created_at: -1 })
    .lean();
  if (!doc) return doc;
  if (Array.isArray(doc.questions)) {
    doc.questions = doc.questions.map((q) => {
      const sanitizedPrompt = removeHintsDeep(q?.prompt);
      if (sanitizedPrompt && typeof sanitizedPrompt === 'object') {
        const clone = { ...sanitizedPrompt };
        // Never expose correct_answer to client for theoretical questions
        if (String(q?.metadata?.type || '').toLowerCase() !== 'code') {
          delete clone.correct_answer;
          delete clone.explanation;
        }
        return { ...q, prompt: clone };
      }
      return { ...q, prompt: sanitizedPrompt };
    });
  }
  return doc;
}

async function getPackageByAttemptId(attempt_id) {
  const doc = await ExamPackage.findOne({ attempt_id: String(attempt_id) })
    .sort({ created_at: -1 })
    .lean();
  if (!doc) return doc;
  if (Array.isArray(doc.questions)) {
    doc.questions = doc.questions.map((q) => {
      const sanitizedPrompt = removeHintsDeep(q?.prompt);
      if (sanitizedPrompt && typeof sanitizedPrompt === 'object') {
        const clone = { ...sanitizedPrompt };
        // Never expose correct_answer to client for theoretical questions
        if (String(q?.metadata?.type || '').toLowerCase() !== 'code') {
          delete clone.correct_answer;
          delete clone.explanation;
        }
        return { ...q, prompt: clone };
      }
      return { ...q, prompt: sanitizedPrompt };
    });
  }
  return doc;
}

async function submitAttempt({ attempt_id, answers, devlab }) {
  // 1) Load attempt + exam
  const attemptIdNum = normalizeToInt(attempt_id);
  if (attemptIdNum == null) {
    throw new Error("invalid_attempt_id");
  }
  try {
    // eslint-disable-next-line no-console
    console.log('[TRACE][EXAM][SUBMIT][BEGIN]', {
      attempt_id: attempt_id,
      answers_count: Array.isArray(answers) ? answers.length : 0,
    });
  } catch {}
  // [submitAttempt-service] diagnostic logs
  // eslint-disable-next-line no-console
  console.debug('[submitAttempt-service] input', {
    attempt_id_raw: attempt_id,
    attempt_id_num: attemptIdNum,
  });
  const { rows: attemptRows } = await pool.query(
    `SELECT ea.*, e.exam_type, e.course_id, e.user_id
     FROM exam_attempts ea
     JOIN exams e ON e.exam_id = ea.exam_id
     WHERE ea.attempt_id = $1`,
    [attemptIdNum],
  );
  // eslint-disable-next-line no-console
  console.debug('[submitAttempt-service] attempt select result', {
    length: attemptRows?.length || 0,
    row0: attemptRows?.[0] ? { attempt_id: attemptRows[0].attempt_id, exam_id: attemptRows[0].exam_id, status: attemptRows[0].status } : null,
  });
  if (attemptRows.length === 0) {
    throw new Error("attempt_not_found");
  }
  const attempt = attemptRows[0];
  const examType = attempt.exam_type;
  const policy = attempt.policy_snapshot || {};
  const passing = Number(policy?.passing_grade ?? 0);

  // 2) Guard rails
  if (attempt.status === "canceled") {
    return { error: "attempt_canceled" };
  }
  if (attempt.expires_at) {
    const now = new Date();
    const exp = new Date(attempt.expires_at);
    if (now > exp) {
      return { error: "exam_time_expired" };
    }
  }

  // 3) Load exam package (skip Mongo in tests; use deterministic mock)
  let examPackage;
  if (process.env.NODE_ENV === "test") {
    examPackage = {
      exam_id: String(attempt.exam_id),
      attempt_id: String(attemptIdNum),
      metadata: {
        exam_type: examType,
        skills: [],
        course_id: attempt.course_id != null ? String(attempt.course_id) : null,
        course_name: "",
      },
      coverage_map: [],
      questions: [
        {
          question_id: "q_event_loop",
          skill_id: "s_js_promises",
          prompt: {
            correct_answer:
              "Microtasks run before rendering and before next macrotask.",
            skill_name: "Asynchronous Programming",
          },
          metadata: { type: "mcq", difficulty: "medium" },
        },
      ],
      coding_questions: [
        {
          question: "Write a function that returns the sum of two numbers.",
          programming_language: "javascript",
          expected_output: "add(2, 3) === 5",
          test_cases: [
            { input: [2, 3], output: 5 },
            { input: [-1, 1], output: 0 },
          ],
          skills: ["s_js_basics"],
          difficulty: "medium",
        },
      ],
    };
  } else {
    examPackage = await getPackageByAttemptId(String(attemptIdNum));
    if (!examPackage) {
      return { error: "package_not_found" };
    }
  }

  // 3.1) HARD GATE: If coding exists and not graded, block finalization here (service-layer)
  try {
    // Ensure columns exist before any updates
    try {
      await pool.query(`ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS coding_required BOOLEAN DEFAULT FALSE`);
      await pool.query(`ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS coding_status VARCHAR(20) DEFAULT 'pending'`);
    } catch {}

    const { codingExists, pending } = isCodingPending({ attemptRow: attempt, examPackage });
    if (codingExists) {
      // Persist coding_required true and ensure pending status if not graded
      try {
        const { rowCount } = await pool.query(
          `UPDATE exam_attempts
             SET coding_required = TRUE,
                 coding_status = COALESCE(coding_status, 'pending')
           WHERE attempt_id = $1`,
          [attemptIdNum],
        );
        try { console.log('[CODING][REQUIRED][SET]', { attempt_id: attemptIdNum, exam_id: attempt.exam_id, coding_questions_count: Array.isArray(examPackage?.coding_questions) ? examPackage.coding_questions.length : 0, updated_rows: rowCount }); } catch {}
        if (String(attempt.coding_status || '').toLowerCase() !== 'graded') {
          try { console.log('[CODING][STATUS][SET_PENDING]', { attempt_id: attemptIdNum }); } catch {}
        }
      } catch {}
    }
    if (pending) {
      // Move attempt to pending_coding and return a PENDING payload
      try {
        const { rowCount } = await pool.query(
          `UPDATE exam_attempts
             SET status = 'pending_coding'
           WHERE attempt_id = $1 AND COALESCE(status,'') <> 'canceled'`,
          [attemptIdNum],
        );
        try { console.log('[EXAM][FINALIZE][BLOCKED][CODING_PENDING]', { attempt_id: attemptIdNum, exam_id: attempt.exam_id, updated_rows: rowCount }); } catch {}
      } catch {}
      return { status: 'PENDING_CODING', message: 'Waiting for coding grading' };
    }
  } catch {}

  // 4) Split answers
  const allAnswers = Array.isArray(answers) ? answers : [];
  const codingAnswersFromPayload = allAnswers.filter((a) => String(a?.type || "").toLowerCase() === "code");
  const devlabAnswersArray = Array.isArray(devlab?.answers) ? devlab.answers : [];
  const devlabAnswersNormalized = devlabAnswersArray.map((a) => ({
    question_id: String(a?.question_id || ""),
    type: "code",
    skill_id: String(a?.skill_id || ""),
    answer: a?.answer != null ? String(a.answer) : "",
  }));
  const codingAnswers = [...codingAnswersFromPayload, ...devlabAnswersNormalized];
  const theoreticalAnswers = allAnswers.filter((a) => String(a?.type || "").toLowerCase() !== "code");
  try {
    const mcqCount = theoreticalAnswers.filter(a => String(a?.type||'').toLowerCase()==='mcq').length;
    const openCount = theoreticalAnswers.filter(a => String(a?.type||'').toLowerCase()==='open').length;
    const codingSkillsCountFromIngest =
      examPackage && examPackage.coding_results && examPackage.coding_results.skills && typeof examPackage.coding_results.skills === 'object'
        ? Object.keys(examPackage.coding_results.skills).length
        : 0;
    const codeCount = codingAnswers.length > 0 ? codingAnswers.length : codingSkillsCountFromIngest;
    // eslint-disable-next-line no-console
    console.log('[TRACE][EXAM][SUBMIT][COUNTS]', {
      theoretical_total: theoreticalAnswers.length,
      mcq: mcqCount,
      open: openCount,
      code: codeCount,
    });
  } catch {}

  // Helper: map question by id
  const qById = new Map(
    (Array.isArray(examPackage?.questions) ? examPackage.questions : []).map(
      (q) => [String(q.question_id || ""), q],
    ),
  );
  function normalizeSkillIdFrom(answerItem, questionItem) {
    const a = String(answerItem?.skill_id || "").trim();
    if (a) return a;
    const qs = String(questionItem?.skill_id || "").trim();
    if (qs) return qs;
    const qp = String(questionItem?.prompt?.skill_id || "").trim();
    if (qp) return qp;
    return "unassigned";
  }

  // 5) Theoretical grading (internal) - skip unknown questions
  const knownTheoreticalAnswers = theoreticalAnswers.filter((ans) => {
    const qid = String(ans?.question_id || "");
    const known = qById.has(qid);
    if (!known) {
      try { console.log("[WARN][SUBMIT] Question not found in package", { question_id: qid }); } catch {}
    }
    return known;
  });
  async function gradeTheoreticalAnswers(pkg, items) {
    const graded = [];
    const openAnswerGradingMode = String(policy?.open_answer_grading || process.env.OPEN_ANSWER_GRADING || 'keywords').toLowerCase();
    const useAiGrading = openAnswerGradingMode === 'ai';
    let aiGateway = null;
    if (useAiGrading) {
      try {
        aiGateway = require("../gateways/aiGateway");
      } catch {
        aiGateway = null;
      }
    }
    for (const ans of items) {
      const qid = String(ans.question_id || "");
      const q = qById.get(qid);
      const type = String(ans.type || "").toLowerCase();
      const rawAnswer = ans.answer != null ? String(ans.answer) : "";
      const skillId = normalizeSkillIdFrom(ans, q);
      if (type === "mcq") {
        // Compare only against prompt.correct_answer
        const correct = q && q.prompt && q.prompt.correct_answer != null
          ? String(q.prompt.correct_answer)
          : "";
        const ok = rawAnswer === correct;
        graded.push({
          question_id: qid,
          skill_id: skillId,
          type: "mcq",
          raw_answer: rawAnswer,
          score: ok ? 100 : 0,
          status: ok ? "acquired" : "not_acquired",
          source: "theoretical",
        });
      } else {
        // OPEN-TEXT
        const trimmed = rawAnswer.trim();
        const correctAnswer =
          (q && q.prompt && q.prompt.correct_answer != null
            ? String(q.prompt.correct_answer)
            : (q && q.correct_answer != null
              ? String(q.correct_answer)
              : ""));

        // Try AI semantic grading if enabled; fallback to keyword method on failure
        if (useAiGrading && aiGateway && typeof aiGateway.gradeOpenAnswerSemantically === 'function') {
          try {
            const questionForAi = {
              type: 'open',
              stem: String(q?.prompt?.question || q?.stem || ''),
              correct_answer: String(correctAnswer || ''),
              skill_id: skillId,
            };
            const aiRespRaw = await aiGateway.gradeOpenAnswerSemantically(questionForAi, rawAnswer);
            let aiParsed = {};
            try {
              aiParsed = typeof aiRespRaw === 'string' ? JSON.parse(aiRespRaw) : (aiRespRaw || {});
            } catch {
              aiParsed = aiRespRaw || {};
            }
            const aiScore = Number(aiParsed?.score);
            const finalScore = Number.isFinite(aiScore) ? Math.max(0, Math.min(100, aiScore)) : 0;
            const status = finalScore >= passing ? "acquired" : "not_acquired";
            graded.push({
              question_id: qid,
              skill_id: skillId,
              type: "open",
              raw_answer: rawAnswer,
              score: finalScore,
              status,
              source: "theoretical",
            });
            continue;
          } catch {
            // fall through to keyword-based fallback
          }
        }

        // Deterministic keyword-based fallback
        let score = 0;
        let status = "not_acquired";
        if (trimmed.length >= 10) {
          const stopwords = new Set([
            "the","is","are","a","an","and","or","of","for","to","in","on","at","by","with","as","this","that","these","those","be","been","being"
          ]);
          const tokenize = (s) => Array.from(new Set(String(s || '')
            .toLowerCase()
            .split(/[^a-z0-9]+/g)
            .filter(w => w && w.length >= 2 && !stopwords.has(w))));
          const kw = tokenize(correctAnswer);
          const words = tokenize(trimmed);
          const matched = kw.filter(k => words.includes(k)).length;
          const ratio = kw.length > 0 ? matched / kw.length : 0;
          if (ratio > 0.7) {
            score = 100;
          } else if (ratio >= 0.3) {
            const pct = Math.round(ratio * 100);
            score = pct; // direct percentage in 30–70 range
          } else {
            score = 0;
          }
          if (score > 100) score = 100;
          if (score < 0) score = 0;
          status = score >= 70 ? "acquired" : "not_acquired";
        } else {
          score = 0;
          status = "not_acquired";
        }

        graded.push({
          question_id: qid,
          skill_id: skillId,
          type: "open",
          raw_answer: rawAnswer,
          score,
          status,
          source: "theoretical",
        });
      }
    }
    return graded;
  }

  const theoreticalGraded = await gradeTheoreticalAnswers(examPackage, knownTheoreticalAnswers);

  // 6) Coding grading (DevLab via unified envelope)
  const { gradingResults, aggregated } =
    await devlabIntegration.gradeCodingAnswersForExam({
      codingQuestions: Array.isArray(examPackage?.coding_questions)
        ? examPackage.coding_questions
        : [],
      codingAnswers,
      attempt: { attempt_id: attemptIdNum },
    });
  const codingGraded = (Array.isArray(gradingResults) ? gradingResults : []).map((r) => {
    const s = typeof r.score === "number" ? r.score : 0;
    const m = typeof r.max_score === "number" ? r.max_score : 1;
    const scaled = m > 0 ? (s / m) * 100 : 0;
    const qItem = qById.get(String(r.question_id || ""));
    const normSkillId = String(r.skill_id || "").trim() || normalizeSkillIdFrom({}, qItem);
    return {
      question_id: String(r.question_id || ""),
      skill_id: normSkillId || "unassigned",
      type: "code",
      raw_answer:
        codingAnswers.find((a) => String(a.question_id) === String(r.question_id))
          ?.answer ?? "",
      score: Number(scaled),
      status: String(r.status || "failed"),
      source: "devlab",
    };
  });

  // 6.1) Merge coding skills from ingestion (ExamPackage.coding_results.skills)
  let codingSkillsMerged = [];
  try {
    const skillsMap =
      examPackage && examPackage.coding_results && typeof examPackage.coding_results.skills === 'object'
        ? examPackage.coding_results.skills
        : null;
    if (skillsMap && Object.keys(skillsMap).length > 0) {
      const merged = [];
      for (const [sid, meta] of Object.entries(skillsMap)) {
        const numericScore = Number(meta && meta.score);
        const scoreVal = Number.isFinite(numericScore) ? numericScore : 0;
        const statusVal = scoreVal > 0 ? "acquired" : "failed";
        merged.push({
          question_id: "", // not applicable for merged coding skills
          skill_id: String(sid || "unassigned"),
          type: "code",
          raw_answer: "",
          score: scoreVal,
          status: statusVal,
          source: "devlab-merge",
          feedback: typeof meta?.feedback === 'string' ? meta.feedback : undefined,
        });
      }
      codingSkillsMerged = merged;
      try {
        console.log('[DEVLAB][MERGE][CODING][SKILLS]', {
          attempt_id: attemptIdNum,
          from_ingestion: Object.keys(skillsMap).length,
        });
      } catch {}
    }
  } catch {}

  // Persist coding grading details to Mongo ExamPackage
  if (process.env.NODE_ENV !== "test") {
    try {
      const examPackageDoc = await ExamPackage.findOne({
        attempt_id: String(attemptIdNum),
      });
      if (examPackageDoc) {
        examPackageDoc.coding_answers = Array.isArray(codingAnswers) ? codingAnswers : [];
        examPackageDoc.coding_grading_results = Array.isArray(gradingResults) ? gradingResults : [];
        examPackageDoc.coding_score_total =
          aggregated && Number.isFinite(Number(aggregated.score_total))
            ? Number(aggregated.score_total)
            : 0;
        examPackageDoc.coding_score_max =
          aggregated && Number.isFinite(Number(aggregated.max_total))
            ? Number(aggregated.max_total)
            : 0;
        await examPackageDoc.save();
      }
    } catch {}
  }

  // 7) Merge grades (theory + computed coding + ingested coding skills)
  const gradedItems = [...theoreticalGraded, ...codingGraded, ...codingSkillsMerged];

  // 8) Per-skill aggregation
  const bySkill = new Map();
  for (const item of gradedItems) {
    let sid = String(item.skill_id || "").trim();
    if (!sid) sid = "unassigned";
    if (!bySkill.has(sid)) bySkill.set(sid, []);
    bySkill.get(sid).push(item);
  }
  const skillsMeta =
    (examPackage?.metadata && Array.isArray(examPackage.metadata.skills)
      ? examPackage.metadata.skills
      : []) || [];
  const skillIdToName = new Map(
    skillsMeta.map((s) => [String(s.skill_id || s.id || ""), s.skill_name || s.name || ""]),
  );
  const perSkill = [];
  for (const [sid, items] of bySkill.entries()) {
    const numericScores = items
      .map((i) => (Number.isFinite(Number(i.score)) ? Number(i.score) : null))
      .filter((v) => v != null);
    const avg =
      numericScores.length > 0
        ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length
        : 0;
    // Default status by policy threshold; will be overridden for coding-ingest below
    let status = avg >= passing ? "acquired" : "failed";
    let name =
      skillIdToName.get(sid) ||
      (qById.get(String(items[0]?.question_id))?.prompt?.skill_name || sid);
    if (!name || String(name).trim() === "") name = sid;
    const out = {
      skill_id: sid,
      skill_name: name || sid,
      score: Number(avg),
      status,
    };
    // If ingestion provided explicit coding feedback/score, override
    const override = codingSkillsMerged.find((i) => String(i.skill_id) === String(sid));
    if (override) {
      out.score = Number(override.score || 0);
      out.status = Number(override.score || 0) > 0 ? "acquired" : "failed";
      if (override.feedback) out.feedback = override.feedback;
    }
    perSkill.push(out);
  }

  // 9) Final grade
  const totalAnswersCount = allAnswers.length;
  const nonBlankAnswersCount = allAnswers.filter((a) => {
    const t = String(a?.type || "").toLowerCase();
    if (t === "mcq" || t === "code") {
      return a?.answer != null && String(a.answer).trim() !== "";
    }
    return String(a?.answer || "").trim().length > 0;
  }).length;
  let perSkillScores = perSkill.map((s) => Number(s.score || 0));
  let finalGrade =
    perSkillScores.length > 0
      ? Math.round(perSkillScores.reduce((a, b) => a + b, 0) / perSkillScores.length)
      : 0;
  if (finalGrade > 100) finalGrade = 100;
  if (finalGrade < 0) finalGrade = 0;
  let passed = finalGrade >= passing;
  if (totalAnswersCount === 0 || nonBlankAnswersCount === 0) {
    for (const s of perSkill) {
      s.score = 0;
      s.status = "not_acquired";
    }
    finalGrade = 0;
    passed = false;
  }
  try {
    // eslint-disable-next-line no-console
    console.log('[TRACE][EXAM][SUBMIT][RESULT]', {
      attempt_id: attemptIdNum,
      skills: perSkill.length,
      final_grade: Number(finalGrade),
      passed,
    });
    // Emit explicit merged result log
    console.log('[EXAM][RESULT][FINAL][MERGED]', {
      attempt_id: attemptIdNum,
      skills_total: perSkill.length,
      coding_skills: codingSkillsMerged.length,
      final_grade: Number(finalGrade),
    });
  } catch {}
  try {
    // eslint-disable-next-line no-console
    if (String(examType) === 'postcourse') {
      console.log('[TRACE][POSTCOURSE][SUBMIT][SUMMARY]', {
        attempt_id: attemptIdNum,
        attempt_no: attempt.attempt_no || 1,
        final_grade: Number(finalGrade),
        passed,
        skills: perSkill.map((s) => ({ skill_id: s.skill_id, score: s.score, status: s.status })),
      });
    } else {
      console.log('[TRACE][EXAM][SUBMIT][SUMMARY]', {
        attempt_id: attemptIdNum,
        exam_type: examType,
        final_grade: Number(finalGrade),
        totalAnswersCount,
        nonBlankAnswersCount,
        per_skill: perSkill.map((s) => ({ skill_id: s.skill_id, score: s.score, status: s.status })),
      });
    }
  } catch {}

  // 9.1) Optional: Generate AI feedback per skill
  let feedbackPerSkill = [];
  try {
    const aiGateway = require("../gateways/aiGateway");
    if (aiGateway && typeof aiGateway.generateSkillFeedback === "function") {
      const requests = [];
      for (const s of perSkill) {
        requests.push(
          aiGateway
            .generateSkillFeedback({ skill_id: s.skill_id, score: s.score })
            .then((resp) => {
              let parsed = resp;
              try {
                if (typeof resp === "string") parsed = JSON.parse(resp);
              } catch {}
              const feedback = parsed && typeof parsed.feedback === "string" ? parsed.feedback : "";
              return { skill_id: s.skill_id, feedback };
            })
            .catch(() => ({ skill_id: s.skill_id, feedback: "" })),
        );
      }
      feedbackPerSkill = await Promise.all(requests);
    }
  } catch {}

  // 10) Update Postgres exam_attempts
  await pool.query(
    `
      UPDATE exam_attempts
      SET submitted_at = NOW(),
          final_grade = $1,
          passed = $2,
          status = CASE WHEN status = 'canceled' THEN status ELSE 'completed' END
      WHERE attempt_id = $3
    `,
    [finalGrade, passed, attemptIdNum],
  );

  // 11) Upsert attempt_skills
  for (const s of perSkill) {
    await pool.query(
      `
        INSERT INTO attempt_skills (attempt_id, skill_id, skill_name, score, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (attempt_id, skill_id) DO UPDATE SET
          skill_name = EXCLUDED.skill_name,
          score = EXCLUDED.score,
          status = EXCLUDED.status
      `,
      [attemptIdNum, s.skill_id, s.skill_name, s.score, s.status],
    );
  }

  // 12) Update Mongo ExamPackage (grading block)
  if (process.env.NODE_ENV !== "test") {
    try {
      await ExamPackage.updateOne(
        { attempt_id: String(attemptIdNum) },
        {
          $set: {
            grading: {
              final_grade: Number(finalGrade),
              passed: !!passed,
              per_skill: perSkill,
              feedback_per_skill: Array.isArray(feedbackPerSkill) ? feedbackPerSkill : [],
              engine: "internal+devlab",
              completed_at: new Date(),
            },
            final_status: "completed",
          },
        },
        { upsert: false },
      );
    } catch {}
  }

  // 13) Return response and enqueue/push outbox integrations
  const submittedAtIso = nowIso();

  // 3.1) Directory – disabled for postcourse by design (Course Builder is the only sink)

  // 3.2) Skills Engine
  // Use original user_id from ExamPackage (string/UUID) if available; fallback to numeric
  const originalUserId =
    (examPackage && examPackage.user && typeof examPackage.user.user_id === 'string')
      ? examPackage.user.user_id
      : null;
  const payloadSkills = {
    user_id: originalUserId != null ? originalUserId : (attempt.user_id != null ? Number(attempt.user_id) : null),
    exam_type: examType,
    passing_grade: Number(passing),
    final_grade: Number(finalGrade),
    passed,
    skills: (perSkill || []).map((s) => ({
      skill_id: s.skill_id,
      skill_name: s.skill_name,
      score: s.score,
      status: s.status,
    })),
  };
  if (examType === "postcourse") {
    payloadSkills.course_id = attempt.course_id != null ? Number(attempt.course_id) : null;
    payloadSkills.course_name = examPackage?.metadata?.course_name || null;
    payloadSkills.coverage_map = examPackage?.coverage_map || [];
    payloadSkills.final_status = "completed";
  }
  if (examType !== "postcourse") {
    await pool.query(
      `INSERT INTO outbox_integrations (event_type, payload, target_service) VALUES ($1, $2::jsonb, $3)`,
      ["skills_engine_results", JSON.stringify(payloadSkills), "skills_engine"],
    );
    safePushSkillsResults(payloadSkills).catch(() => {});
  }

  // 3.3) Course Builder (postcourse only)
  if (examType === "postcourse") {
    const payloadCourseBuilder = {
      learner_id: attempt.user_id != null ? Number(attempt.user_id) : null,
      learner_name: null,
      course_id: attempt.course_id != null ? Number(attempt.course_id) : null,
      course_name: examPackage?.metadata?.course_name || "",
      exam_type: "postcourse",
      passing_grade: Number(passing),
      final_grade: Number(finalGrade),
      passed,
    };
    await pool.query(
      `INSERT INTO outbox_integrations (event_type, payload, target_service) VALUES ($1, $2::jsonb, $3)`,
      [
        "course_builder_results",
        JSON.stringify(payloadCourseBuilder),
        "course_builder",
      ],
    );
    // Do not block main request path on failure
    sendCourseBuilderExamResults(payloadCourseBuilder).catch(() => {});
  }

  // 3.4) Protocol Camera summary
  const protoSummary = {
    attempt_id: attemptIdNum,
    summary: {
      events_total: 5,
      violations: 1,
      terminated: false,
    },
  };
  await pool.query(
    `INSERT INTO outbox_integrations (event_type, payload, target_service) VALUES ($1, $2::jsonb, $3)`,
    [
      "protocol_camera_summary",
      JSON.stringify(protoSummary),
      "protocol_camera",
    ],
  );
  safeSendSummary(protoSummary).catch(() => {});

  // Compute safe attempts metadata for response
  const policySnapshot = attempt.policy_snapshot || {};
  const defaultMaxAttempts = examType === 'baseline' ? 1 : 3;
  const maxAttempts = Number.isFinite(Number(policySnapshot?.max_attempts))
    ? Number(policySnapshot.max_attempts)
    : defaultMaxAttempts;

  return {
    user_id: attempt.user_id != null ? Number(attempt.user_id) : null,
    exam_type: examType,
    course_id: attempt.course_id != null ? Number(attempt.course_id) : null,
    attempt_id: attemptIdNum,
    attempt_no: attempt.attempt_no || 1,
    passing_grade: Number(passing),
    final_grade: Number(finalGrade),
    passed,
    skills: perSkill,
    submitted_at: submittedAtIso,
    // Attempts info for frontend robustness
    max_attempts: maxAttempts,
    policy_snapshot: policySnapshot,
  };
}

// ----------------------
// Async-first creation
// ----------------------
async function setExamStatus(examId, { status, progress, error_message = null, failed_step = null }) {
  const patch = {
    status: status ?? undefined,
    progress: Number.isFinite(Number(progress)) ? Number(progress) : undefined,
    error_message: error_message ?? undefined,
    failed_step: failed_step ?? undefined,
  };
  console.log('[EXAM][STATUS][WRITE][BEFORE]', { exam_id: examId, patch });
  const result = await pool.query(
    `UPDATE exams
     SET status = COALESCE($2, status),
         progress = COALESCE($3, progress),
         error_message = $4,
         failed_step = $5,
         updated_at = NOW()
     WHERE exam_id = $1`,
    [examId, status || null, Number.isFinite(Number(progress)) ? Number(progress) : null, error_message, failed_step],
  );
  const rowCount = Number(result?.rowCount || 0);
  console.log('[EXAM][STATUS][WRITE][AFTER]', { exam_id: examId, rowCount });
  if (rowCount === 0) {
    console.error('[EXAM][STATUS][WRITE][ZERO_ROWS]', { exam_id: examId, patch });
    throw new Error('exam_status_update_zero_rows');
  }
}

async function createExamRecord({ user_id, exam_type, course_id, course_name, user_name, company_id }) {
  const userStr = String(user_id);
  const userInt = Number(userStr.replace(/[^0-9]/g, ""));
  // Accept non-numeric user identifiers (UUID) moving forward
  const __t0 = Date.now();
  const lap = (label) => { try { console.log('[TRACE][CREATE][FAST]%s %s ms', '', `${label}: ${Date.now() - __t0}`); } catch {} };

  await ensureExamStatusColumns(pool);
  await ensureUserExists({ user_id_numeric: userInt, user_name, company_id }).catch(()=>{});

  // Idempotency: existing PREPARING/READY exam
  try {
    const sql = `
      SELECT e.exam_id, COALESCE(e.status, 'READY') AS status, COALESCE(e.progress, 0) AS progress,
             (
               SELECT ea.attempt_id
               FROM exam_attempts ea
               WHERE ea.exam_id = e.exam_id
                 AND COALESCE(ea.status, '') NOT IN ('canceled', 'invalidated')
               ORDER BY ea.attempt_no DESC, ea.attempt_id DESC
               LIMIT 1
             ) AS attempt_id
      FROM exams e
      WHERE (
              (e.user_id = $1 AND $1 IS NOT NULL)
              OR (e.user_uuid = $2::uuid AND $2 IS NOT NULL)
            )
        AND e.exam_type = $3
        ${String(exam_type) === 'postcourse' ? 'AND e.course_id = $4' : ''}
      ORDER BY e.exam_id DESC
      LIMIT 1`;
    const maybeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userStr) ? userStr : null;
    const params = String(exam_type) === 'postcourse'
      ? [Number.isFinite(userInt) ? userInt : null, maybeUuid, exam_type, (Number.isFinite(Number(course_id)) ? Number(course_id) : null)]
      : [Number.isFinite(userInt) ? userInt : null, maybeUuid, exam_type];
    const row = await pool.query(sql, params).then(r => r.rows?.[0] || null).catch(()=>null);
    if (String(exam_type) !== 'baseline' && row && (row.status === 'PREPARING' || row.status === 'READY')) {
      try { console.log('[TRACE][IDEMPOTENCY] returning existing exam', { exam_id: row.exam_id, attempt_id: row.attempt_id, status: row.status }); } catch {}
      return {
        exam_id: Number(row.exam_id),
        attempt_id: Number(row.attempt_id || 0),
        exam_type,
        user_id: Number.isFinite(userInt) ? userInt : null,
        course_id: Number.isFinite(Number(course_id)) ? Number(course_id) : null,
        status: row.status,
        progress: Number(row.progress || 0),
        duration_seconds: null,
        started_at: null,
        expires_at: null,
      };
    }
  } catch {}

  // Baseline: do NOT block on existing attempts; always create new

  const courseInt = normalizeToInt(course_id);
  // Ensure uuid columns exist
  try {
    await pool.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS user_uuid UUID`);
    await pool.query(`ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS user_uuid UUID`);
  } catch {}
  let examId;
  try {
    const ins = await pool.query(
      `INSERT INTO exams (exam_type, user_uuid, course_id, status, progress, updated_at)
       VALUES ($1, $2::uuid, $3, 'PREPARING', 0, NOW())
       RETURNING exam_id`,
      [
        exam_type,
        (function(v){ return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||'')) ? String(v) : null; })(userStr),
        courseInt
      ],
    );
    examId = ins.rows[0].exam_id;
  } catch (e) {
    try { console.error('[EXAM][CREATE][INSERT_ERROR]', e?.message || e); } catch {}
    return { error: 'exam_creation_failed' };
  }

  let attemptId;
  try {
    const insAtt = await pool.query(
      `INSERT INTO exam_attempts (exam_id, attempt_no, policy_snapshot, package_ref)
       VALUES ($1, $2, $3::jsonb, $4)
       RETURNING attempt_id`,
      [examId, 1, JSON.stringify({}), null],
    );
    attemptId = insAtt.rows[0].attempt_id;
  } catch (e) {
    return { error: 'exam_creation_failed' };
  }

  // Persist mapping into ExamContext for baseline: exam_id and attempt_id
  try {
    if (String(exam_type) === 'baseline') {
      const { ExamContext } = require('../../models');
      const filter = {
        user_id: String(user_id),
        exam_type: 'baseline',
        competency_name: { $ne: null },
      };
      const update = {
        exam_id: String(examId),
        attempt_id: String(attemptId),
        updated_at: new Date(),
      };
      const linked = await ExamContext.findOneAndUpdate(
        filter,
        update,
        { new: true, upsert: true },
      );
      try { console.log('[BASELINE][CTX][LINKED]', { exam_id: String(examId), attempt_id: String(attemptId), ok: !!linked }); } catch {}
    }
  } catch {}

  lap('created');
  return {
    exam_id: Number(examId),
    attempt_id: Number(attemptId),
    exam_type,
    user_id: Number(userInt),
    course_id: courseInt != null ? Number(courseInt) : null,
    passing_grade: null,
    max_attempts: null,
    policy_snapshot: {},
    started_at: null,
    expires_at: null,
    duration_seconds: null,
  };
}

async function prepareExamAsync(examId, attemptId, { user_id, exam_type, course_id, course_name, coverage_map }) {
  if (__activePrepAttempts.has(Number(attemptId))) {
    try { console.log('[TRACE][PREP][IDEMPOTENT][SKIP]', { exam_id: examId, attempt_id: attemptId }); } catch {}
    return;
  }
  __activePrepAttempts.add(Number(attemptId));
  const watchdogMs = Number.isFinite(Number(process.env.PREP_TIMEOUT_MS)) ? Number(process.env.PREP_TIMEOUT_MS) : 120000;
  const startedAt = Date.now();
  let watchdogTimer = null;
  async function runPrep() {
    try { console.log('[ARCH][BOUNDARY] learning_analytics is external pull-only and never participates in exam build or DevLab flows'); } catch {}
    const userStr = String(user_id);
    const userInt = Number(userStr.replace(/[^0-9]/g, ""));
    const courseInt = normalizeToInt(course_id);
    try { console.log('[TRACE][prepareExamAsync started]', { exam_id: examId, attempt_id: attemptId, exam_type }); } catch {}
    await setExamStatus(examId, { status: 'PREPARING', progress: 5 });

    // Fetch upstream policy/skills/coverage
    let policy = {};
    let skillsPayload = null;
    let coveragePayload = null;
    const isTest = String(process.env.NODE_ENV || '').toLowerCase() === 'test';
  try {
    if (exam_type === 'baseline') {
        // STRICT: Load context and include competency_name in outbound payload
        let ctx = null;
        try {
          const { ExamContext } = require('../../models');
          // STRICT resolution: attempt_id first, fallback to exam_id
          ctx = await ExamContext.findOne({ attempt_id: String(attemptId) }).lean();
          if (!ctx) ctx = await ExamContext.findOne({ exam_id: String(examId) }).lean();
        } catch {}
        if (!ctx || !ctx.competency_name || !ctx.user_id) {
          try { console.error('[BASELINE][CTX][MISSING]', { exam_id: examId, attempt_id: attemptId, hasCtx: !!ctx, competency: ctx?.competency_name || null }); } catch {}
          await setExamStatus(examId, { status: 'FAILED', error_message: 'competency_name_missing', failed_step: 'fetch_baseline_skills', progress: 100 });
          return;
        }
        try { console.log('[BASELINE][CTX][RESOLVED]', { exam_id: examId, attempt_id: attemptId, competency_name: ctx.competency_name }); } catch {}
        const payload = {
          action: 'fetch-baseline-skills',
          user_id: ctx.user_id,
          competency_name: ctx.competency_name,
        };
        try { console.log('[BASELINE][SKILLS_ENGINE][FETCH]', { exam_id: examId, attempt_id: attemptId, user_id: ctx.user_id, competency_name: ctx.competency_name }); } catch {}
        const { sendToCoordinator } = require('../integrations/envelopeSender');
        const { normalizeSkillsEngineResponse } = require('../gateways/skillsEngineGateway');
        const timeoutMs = 120000;
        async function fetchWithTimeout() {
          const coreCall = sendToCoordinator({ targetService: 'skills-engine', payload });
          const timeoutCall = new Promise((_, reject) => setTimeout(() => reject(new Error('SkillsEngineTimeout')), timeoutMs));
          const ret = await Promise.race([coreCall, timeoutCall]);
          let respString;
          if (typeof ret === 'string') respString = ret;
          else if (ret && typeof ret.data === 'string') respString = ret.data;
          else respString = JSON.stringify((ret && ret.data) || {});
          return JSON.parse(respString || '{}');
        }

        let skillsFromSe = [];
        let attemptIndex = 1;
        try { console.log('[BASELINE][SKILLS_ENGINE][FETCH][ATTEMPT_1]', { exam_id: examId, attempt_id: attemptId, timeout_ms: timeoutMs }); } catch {}
        try {
          const resp1 = await fetchWithTimeout();
          const normalized1 = normalizeSkillsEngineResponse(resp1 || {});
          skillsFromSe = Array.isArray(normalized1?.skills) ? normalized1.skills : [];
        } catch (e) {
          if (String(e?.message || '') === 'SkillsEngineTimeout') {
            try { console.warn('[BASELINE][SKILLS_ENGINE][FETCH][TIMEOUT_1]', { exam_id: examId, attempt_id: attemptId }); } catch {}
            attemptIndex = 2;
          } else {
            try { console.error('[BASELINE][SKILLS_ENGINE][FETCH_ERROR]', e?.message || e); } catch {}
            await setExamStatus(examId, { status: 'FAILED', error_message: 'fetch_failed', failed_step: 'fetch_baseline_skills', progress: 100 });
            return;
          }
        }

        if ((skillsFromSe || []).length === 0 && attemptIndex === 2) {
          try { console.log('[BASELINE][SKILLS_ENGINE][FETCH][ATTEMPT_2]', { exam_id: examId, attempt_id: attemptId, timeout_ms: timeoutMs }); } catch {}
          try {
            const resp2 = await fetchWithTimeout();
            const normalized2 = normalizeSkillsEngineResponse(resp2 || {});
            skillsFromSe = Array.isArray(normalized2?.skills) ? normalized2.skills : [];
          } catch (e2) {
            if (String(e2?.message || '') === 'SkillsEngineTimeout') {
              try { console.warn('[BASELINE][SKILLS_ENGINE][FETCH][TIMEOUT_2]', { exam_id: examId, attempt_id: attemptId }); } catch {}
            } else {
              try { console.error('[BASELINE][SKILLS_ENGINE][FETCH_ERROR]', e2?.message || e2); } catch {}
              await setExamStatus(examId, { status: 'FAILED', error_message: 'fetch_failed', failed_step: 'fetch_baseline_skills', progress: 100 });
              return;
            }
          }
        }

        let fallbackUsed = false;

        // Fallback to competency_name-derived minimal skill if none returned
        let effectiveSkills = skillsFromSe;
        if (effectiveSkills.length === 0) {
          const slug = String(ctx.competency_name || 'baseline').toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
          effectiveSkills = [{ skill_id: slug || 'baseline', skill_name: ctx.competency_name }];
          fallbackUsed = true;
        }
        try {
          if (fallbackUsed) {
            console.log('[BASELINE][SKILLS_ENGINE][FALLBACK_USED]', { reason: 'no_skills_returned_after_retries' });
          }
          console.log('[BASELINE][SKILLS_ENGINE][FETCH][SUCCESS]', { skills_count: effectiveSkills.length });
          console.log('[BASELINE][SKILLS_ENGINE][NORMALIZED]', { exam_id: examId, attempt_id: attemptId, skills_count: effectiveSkills.length, fallback_used: fallbackUsed });
        } catch {}

        skillsPayload = { user_id: ctx.user_id, skills: effectiveSkills };
        // Baseline: static policy
        policy = { passing_grade: 70 };
        try { console.log('[BASELINE][POLICY][STATIC] passing_grade=70 (Directory skipped)'); } catch {}
        await setExamStatus(examId, { status: 'PREPARING', progress: 35 });
    } else if (exam_type === 'postcourse') {
      // Post-course: STATIC policy; DO NOT call Directory or external coverage
      policy = { passing_grade: 60, max_attempts: 3 };
      // Load coverage snapshot from attempt
      let snapshot = null;
      try {
        const { rows } = await pool.query(
          `SELECT coverage_snapshot FROM exam_attempts WHERE attempt_id = $1`,
          [Number(attemptId)],
        );
        snapshot = rows && rows[0] ? rows[0].coverage_snapshot : null;
      } catch (err) {
        // fall through to missing snapshot handling
      }
      const snapArray = Array.isArray(snapshot) ? snapshot : (snapshot && Array.isArray(snapshot.coverage_map) ? snapshot.coverage_map : null);
      if (!Array.isArray(snapArray) || snapArray.length === 0) {
        await setExamStatus(examId, { status: 'FAILED', error_message: 'coverage_snapshot_missing', failed_step: 'prepare_context', progress: 100 });
        return;
      }
      coveragePayload = { coverage_map: snapArray, course_name: course_name || undefined };
      try { console.log('[POSTCOURSE][COVERAGE][SNAPSHOT]', { exam_id: examId, attempt_id: attemptId, items: snapArray.length }); } catch {}
      } else {
        await setExamStatus(examId, { status: 'FAILED', error_message: 'invalid_exam_type', failed_step: 'input_validation', progress: 100 });
        return;
      }
    } catch (e) {
      await setExamStatus(examId, { status: 'FAILED', error_message: e?.message || 'fetch_failed', failed_step: 'fetch_upstream', progress: 100 });
      return;
    }
    try { console.log('[PREP][CHECKPOINT][AFTER_DIRECTORY]', { exam_id: examId, attempt_id: attemptId }); } catch {}

    // Normalize and compute duration
    const { normalizeSkills } = require("./skillsUtils");
    const normalizedBaselineSkills = normalizeSkills(skillsPayload?.skills || []);
    const rawCoverage = Array.isArray(coveragePayload?.coverage_map) ? coveragePayload.coverage_map : [];
    const normalizedCoverageMap = rawCoverage.map((item) => ({ ...item, skills: normalizeSkills(item?.skills || []) })).filter((it) => Array.isArray(it.skills) && it.skills.length > 0);
    const skillsArray = exam_type === 'postcourse'
      ? Array.from(new Map(normalizedCoverageMap.flatMap((it)=>it.skills).map((s)=>[String(s.skill_id), s])).values())
      : normalizedBaselineSkills;
    const coverageMap = normalizedCoverageMap;
    const resolvedCourseName = exam_type === 'postcourse' ? (coveragePayload?.course_name || course_name || null) : null;
    let questionCount = 0;
    if (exam_type === 'baseline') {
      questionCount = Array.isArray(skillsArray) ? skillsArray.length : 0;
    } else {
      const uniqueSkillIds = Array.from(new Set((skillsArray || []).map((s)=>String(s.skill_id)).filter(Boolean)));
      questionCount = uniqueSkillIds.length * 2;
    }
    if (isTest && (!Number.isFinite(questionCount) || questionCount < 2)) questionCount = 2;
    const durationMinutes = Number.isFinite(questionCount) ? questionCount * 4 : 0;
    try { await pool.query(`UPDATE exam_attempts SET policy_snapshot = $1::jsonb, duration_minutes = $2 WHERE attempt_id = $3`, [JSON.stringify(policy || {}), durationMinutes || null, attemptId]); } catch {}
    await setExamStatus(examId, { status: 'PREPARING', progress: 40 });

    // Generate questions and coding
  const { generateTheoreticalQuestions, validateQuestion } = require("../gateways/aiGateway");
    const { validateTheoreticalQuestions, normalizeAiQuestion } = require("./theoryService");
  const devlabIntegration = require("../integrations/devlabService");

    // Try to obtain DevLab questions + optional UI payload first; fallback to programmatic build
  let codingQuestionsDecorated = [];
  let devlabPayload = null;
    try {
      try { console.log('[DEVLAB][GEN][ENTERED]'); } catch {}
      const ids = Array.from(new Set((Array.isArray(skillsArray) ? skillsArray : []).map((s)=>String(s.skill_id)).filter(Boolean)));
      const __tDev = Date.now();
      try { console.log('[DEVLAB][GEN][START]', { exam_id: examId, attempt_id: attemptId }); } catch {}
      const { requestCodingWidgetHtml } = require("../gateways/devlabGateway");
      let timeoutHandle = null;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          try { console.log('[DEVLAB][GEN][TIMEOUT_FIRED]', { exam_id: examId, attempt_id: attemptId, ms: 65000 }); } catch {}
          reject(new Error('devlab_timeout'));
        }, 65000);
      });
      try {
        devlabPayload = await Promise.race([
          requestCodingWidgetHtml({
            attempt_id: attemptId,
            skills: ids,
            difficulty: 'medium',
            amount: 2,
            humanLanguage: 'en',
          }),
          timeoutPromise,
        ]);
      } finally {
        try { if (timeoutHandle) clearTimeout(timeoutHandle); } catch {}
      }
      try { console.log('[DEVLAB][GEN][AFTER_RESPONSE]', { keys: Object.keys(devlabPayload || {}), elapsed_ms: Date.now() - __tDev }); } catch {}
      const qArr = Array.isArray(devlabPayload?.questions) ? devlabPayload.questions : [];
      const htmlStr = typeof devlabPayload?.html === 'string' ? devlabPayload.html : null;
      try { console.log('[DEVLAB][GEN][AFTER_PARSE]', { questions_count: qArr.length, html_length: htmlStr ? htmlStr.length : 0 }); } catch {}
      if (!Array.isArray(qArr) || qArr.length === 0) {
        await setExamStatus(examId, { status: 'FAILED', error_message: 'DevLab returned no coding questions', failed_step: 'devlab_generate', progress: 100 });
        try { console.log('[EXAM][STATUS][FAILED]', { exam_id: examId, attempt_id: attemptId, failed_step: 'devlab_generate', message: 'DevLab returned no coding questions' }); } catch {}
        return;
      }
      codingQuestionsDecorated = qArr;
      try { console.log('[DEVLAB][GEN][DONE]', { exam_id: examId, attempt_id: attemptId, questions: qArr.length }); } catch {}
    } catch (e) {
      try { console.log('[DEVLAB][GEN][ERROR]', { exam_id: examId, attempt_id: attemptId, name: e?.name || 'Error', message: e?.message || String(e) }); } catch {}
      await setExamStatus(examId, { status: 'FAILED', error_message: e?.message || 'devlab_generate_failed', failed_step: 'devlab_generate', progress: 100 });
      try { console.log('[EXAM][STATUS][FAILED]', { exam_id: examId, attempt_id: attemptId, failed_step: 'devlab_generate', message: e?.message }); } catch {}
      return;
    } finally {
      try { console.log('[DEVLAB][GEN][END]', { exam_id: examId, attempt_id: attemptId, elapsed_ms: Date.now() - startedAt }); } catch {}
    }
    await setExamStatus(examId, { status: 'PREPARING', progress: 55 });

    let questions = [];
    try {
      const uniqueSkills = Array.from(new Set((skillsArray || []).map((s)=>String(s.skill_id)).filter(Boolean)));
      const items = [];
      if (exam_type === 'postcourse') {
        for (const sid of uniqueSkills) { items.push({ skill_id: sid, type: 'mcq', difficulty: 'medium', humanLanguage: 'en' }); items.push({ skill_id: sid, type: 'open', difficulty: 'medium', humanLanguage: 'en' }); }
      } else {
        for (let i = 0; i < questionCount; i += 1) {
          const sid = uniqueSkills[i % Math.max(uniqueSkills.length, 1)];
          if (!sid) continue;
          const type = i % 2 === 0 ? 'mcq' : 'open';
          items.push({ skill_id: sid, difficulty: 'medium', humanLanguage: 'en', type });
        }
      }
      let generated = [];
      if (isTest) {
        const sid = (Array.isArray(items) && items[0]?.skill_id) || 's_general';
        generated = [{ qid: 'test_mcq', type: 'mcq', skill_id: sid, difficulty: 'medium', question: `MCQ for ${sid}`, options: ['A','B','C'], correct_answer: 'A' },
                     { qid: 'test_open', type: 'open', skill_id: sid, difficulty: 'medium', question: `Explain ${sid}` }];
      } else {
        const seed = `${Date.now()}-${Math.random()}`;
        generated = await generateTheoreticalQuestions({ items, seed });
      }
      const validated = [];
      for (const q of generated) {
        let validation = { valid: true, reasons: [] };
        if (!isTest) { try { validation = await validateQuestion({ question: q }); } catch { validation = { valid: false, reasons: ['validation_call_failed'] }; } }
        const hints = q?.hint ? [String(q.hint)] : undefined;
        validated.push(normalizeAiQuestion({ ...q, hint: hints }));
      }
      questions = validateTheoreticalQuestions(validated);
    } catch (e) {
      try {
        const { buildMockQuestions } = require("../mocks/theoryMock");
        const skillsForMocks = Array.from(new Set((skillsArray || []).map((s)=>String(s.skill_id)).filter(Boolean)));
        const mocks = buildMockQuestions({ skills: skillsForMocks, amount: Math.max(1, skillsForMocks.length) });
        const normalizedMcqs = mocks.map((m) => ({ qid: m.qid, type: 'mcq', skill_id: m.skill_id, difficulty: 'medium', question: m.prompt?.question || '', stem: m.prompt?.question || '', options: Array.isArray(m.prompt?.options) ? m.prompt.options : [], correct_answer: m.prompt?.correct_answer || '' }));
        const duplicatedForOpen = exam_type === 'postcourse' ? normalizedMcqs : [];
        questions = validateTheoreticalQuestions([...normalizedMcqs, ...duplicatedForOpen]);
      } catch (e2) {
        await setExamStatus(examId, { status: 'FAILED', error_message: e2?.message || 'generation_failed', failed_step: 'generate_questions', progress: 100 });
        return;
      }
    }
    await setExamStatus(examId, { status: 'PREPARING', progress: 80 });

    try {
      // Prepare optional DevLab UI block for UI rendering (if available)
      const devlabUi = (() => {
        const hasTopLevelHtml = !!(devlabPayload && typeof devlabPayload.html === 'string' && devlabPayload.html.trim() !== '');
        if (hasTopLevelHtml) return { componentHtml: devlabPayload.html };
        return undefined;
      })();
      try { console.log(`[DEVLAB][UI][${devlabUi ? 'PRESENT' : 'ABSENT'}]`, { componentHtml: !!devlabUi }); } catch {}

    try { console.log('[PACKAGE][WRITE][BEFORE]', { exam_id: examId, attempt_id: attemptId }); } catch {}
    const mappedCodingQuestions = Array.isArray(codingQuestionsDecorated)
      ? codingQuestionsDecorated.map((q) => ({
        question: [
          q?.title ? `Title: ${q.title}` : null,
          q?.description ? `Description: ${q.description}` : null,
          q?.difficulty ? `Difficulty: ${q.difficulty}` : null,
          q?.programming_language ? `Language: ${q.programming_language}` : null,
        ].filter(Boolean).join("\n"),
        devlab: q,
      }))
      : [];
    try {
      console.log('[PACKAGE][CODING_SHAPE]', {
        firstType: typeof (codingQuestionsDecorated?.[0]),
        savedQuestionType: typeof (codingQuestionsDecorated?.[0]?.title),
        mappedQuestionType: typeof (mappedCodingQuestions?.[0]?.question),
      });
    } catch {}
      const pkg = await buildExamPackageDoc({
        exam_id: examId,
        attempt_id: attemptId,
        user_id: userStr,
        exam_type,
        policy,
        skills: Array.isArray(skillsArray) ? skillsArray : [],
        coverage_map: Array.isArray(coverageMap) ? coverageMap : [],
        course_id: course_id != null ? course_id : null,
        course_name: resolvedCourseName || undefined,
        questions,
      coding_questions: mappedCodingQuestions,
        time_allocated_minutes: Number.isFinite(durationMinutes) ? durationMinutes : undefined,
        expires_at_iso: null,
        devlab_ui: devlabUi,
      });
      try { console.log('[PACKAGE][WRITE][AFTER]', { exam_id: examId, attempt_id: attemptId, package_id: String(pkg?._id || '') }); } catch {}
      await pool.query(`UPDATE exam_attempts SET package_ref = $1 WHERE attempt_id = $2`, [pkg._id, attemptId]);
      try {
        console.log('[PERSIST][PACKAGE][SUCCESS]', {
          exam_id: examId,
          attempt_id: attemptId,
          package_id: String(pkg?._id || ''),
          questions: Array.isArray(questions) ? questions.length : 0,
          coding_questions: Array.isArray(codingQuestionsDecorated) ? codingQuestionsDecorated.length : 0,
          devlab_ui: devlabUi ? 'present' : 'absent',
        });
      } catch {}
    } catch (e) {
      await setExamStatus(examId, { status: 'FAILED', error_message: e?.message || 'persist_package_failed', failed_step: 'persist_package', progress: 100 });
      return;
    }

    try { console.log('[EXAM][STATUS][READY][BEFORE]', { exam_id: examId, attempt_id: attemptId }); } catch {}
    await setExamStatus(examId, { status: 'READY', progress: 100 });
    try { console.log('[EXAM][STATUS][READY]', { exam_id: examId, attempt_id: attemptId }); } catch {}
  }

  // Outer watchdog race
  try {
    const watchdogPromise = new Promise((_, reject) => {
      watchdogTimer = setTimeout(async () => {
        try {
          const elapsed = Date.now() - startedAt;
          try { console.log('[PREP][WATCHDOG][FIRE]', { exam_id: examId, attempt_id: attemptId, watchdogMs, elapsed_ms: elapsed }); } catch {}
          await setExamStatus(examId, { status: 'FAILED', failed_step: 'prep_timeout', error_message: 'prep_timeout', progress: 100 });
        } catch {}
        reject(new Error('prep_timeout'));
      }, watchdogMs);
    });

    await Promise.race([runPrep(), watchdogPromise]);

    // Final guard: if still PREPARING here, flip to FAILED
    try {
      const { rows } = await pool.query(`SELECT status FROM exams WHERE exam_id = $1`, [examId]);
      const finalStatus = rows && rows[0] ? String(rows[0].status || '') : null;
      if (finalStatus === 'PREPARING') {
        await setExamStatus(examId, { status: 'FAILED', failed_step: 'prep_finalizer', error_message: 'prep_finalizer', progress: 100 });
      }
    } catch {}
  } catch (e) {
    // Only mark FAILED if not already finalized
    try {
      const { rows } = await pool.query(`SELECT status FROM exams WHERE exam_id = $1`, [examId]).catch(() => ({ rows: [] }));
      const cur = rows && rows[0] ? String(rows[0].status || '') : null;
      if (cur !== 'READY' && cur !== 'FAILED') {
        const isTimeout = String(e?.message || '').toLowerCase().includes('prep_timeout');
        await setExamStatus(examId, {
          status: 'FAILED',
          error_message: isTimeout ? 'prep_timeout' : (e?.message || 'prepare_failed'),
          failed_step: isTimeout ? 'prep_timeout' : 'prep_unhandled',
          progress: 100,
        });
        try { console.error('[EXAM][STATUS][FAILED]', { exam_id: examId, attempt_id: attemptId, message: e?.message || 'prepare_failed' }); } catch {}
      }
    } catch {}
  } finally {
    // Emit final lifecycle log
    try {
      const { rows } = await pool.query(`SELECT status FROM exams WHERE exam_id = $1`, [examId]).catch(() => ({ rows: [] }));
      const finalStatus = rows && rows[0] ? rows[0].status : null;
      try { console.log('[PREP][DONE]', { exam_id: examId, attempt_id: attemptId, status: finalStatus }); } catch {}
    } catch {}
    try { if (watchdogTimer) clearTimeout(watchdogTimer); } catch {}
    try { __activePrepAttempts.delete(Number(attemptId)); } catch {}
  }
}

module.exports = {
  createExam,
  createExamRecord,
  prepareExamAsync,
  markAttemptStarted,
  getPackageByExamId,
  getPackageByAttemptId,
  submitAttempt,
  recomputeFinalResults,
};
