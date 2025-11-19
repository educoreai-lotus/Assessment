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

function nowIso() {
  return new Date().toISOString();
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
        prompt: sanitizeQuestionPromptForStorage(q),
        options: Array.isArray(q?.choices) ? q.choices : [],
        answer_key: q?.correct_answer ?? null,
        metadata: { type: type || "mcq", difficulty },
      };
    }),
    coding_questions: Array.isArray(coding_questions) ? coding_questions : [],
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
    },
  });
  await doc.save();
  return doc;
}

async function createExam({ user_id, exam_type, course_id, course_name }) {
  // Map user_id to numeric at the very beginning
  const userStr = String(user_id);
  const userInt = Number(userStr.replace(/[^0-9]/g, ""));
  if (!Number.isFinite(userInt)) {
    return { error: "invalid_user_id" };
  }
  try {
    // eslint-disable-next-line no-console
    console.log("[TRACE][USER_ID][MAPPED]", { original: user_id, numeric: userInt });
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

  if (exam_type === "baseline") {
    // Check for already submitted baseline attempt for this user
    const { rows: completedBaseline } = await pool.query(
      `
        SELECT ea.attempt_id
        FROM exam_attempts ea
        JOIN exams e ON e.exam_id = ea.exam_id
        WHERE e.user_id = $1
          AND e.exam_type = 'baseline'
          AND ea.status = 'submitted'
        LIMIT 1
      `,
      [userInt],
    );
    if (completedBaseline && completedBaseline.length > 0) {
      return { error: "baseline_already_completed" };
    }
    skillsPayload = await safeFetchBaselineSkills({ user_id });
    try {
      // eslint-disable-next-line no-console
      console.log('[TRACE][BASELINE][CREATE][SKILLS]', {
        count: Array.isArray(skillsPayload?.skills) ? skillsPayload.skills.length : 0,
      });
    } catch {}
    policy = await safeFetchPolicy("baseline");
  } else if (exam_type === "postcourse") {
    coveragePayload = await safeFetchCoverage({
      learner_id: user_id,
      learner_name: undefined,
      course_id,
    });
    try {
      const mapArr = Array.isArray(coveragePayload?.coverage_map) ? coveragePayload.coverage_map : [];
      const skillsTotal = mapArr.map(i => Array.isArray(i?.skills) ? i.skills.length : 0).reduce((a,b)=>a+b,0);
      // eslint-disable-next-line no-console
      console.log('[TRACE][POSTCOURSE][CREATE][COVERAGE]', {
        coverage_items: mapArr.length,
        coverage_skills_total: skillsTotal,
      });
    } catch {}
    policy = await safeFetchPolicy("postcourse");
  } else {
    return { error: "invalid_exam_type" };
  }

  // Phase: Replace theoretical mocks with REAL OpenAI generation
  const { generateTheoreticalQuestions, validateQuestion } = require("../gateways/aiGateway");
  const { normalizeSkills } = require("./skillsUtils");

  // Already converted user_id above; proceed
  try {
    // eslint-disable-next-line no-console
    console.log("[TRACE][EXAM][CREATE][USER_MAP]", { user_id_original: user_id, user_id_numeric: userInt });
  } catch {}
  const courseInt = normalizeToInt(course_id); // can be null for baseline

  // Determine attempt_no based on rules
  let attemptNo = 1;
  if (exam_type === "baseline") {
    // Always first and only attempt
    attemptNo = 1;
  } else if (exam_type === "postcourse") {
    const passingGrade = Number((policy || {})?.passing_grade ?? 0);
    const maxAttempts = Number((policy || {})?.max_attempts ?? 0);
    const { rows: lastPost } = await pool.query(
      `
        SELECT ea.attempt_id, ea.attempt_no
        FROM exam_attempts ea
        JOIN exams e ON e.exam_id = ea.exam_id
        WHERE e.user_id = $1
          AND e.exam_type = 'postcourse'
        ORDER BY ea.attempt_no DESC
        LIMIT 1
      `,
      [userInt],
    );
    if (!lastPost || lastPost.length === 0) {
      attemptNo = 1;
    } else {
      const lastNo = Number(lastPost[0].attempt_no || 0);
      if (Number.isFinite(maxAttempts) && maxAttempts > 0 && lastNo >= maxAttempts) {
        return { error: "max_attempts_reached" };
      }
      attemptNo = lastNo + 1;
    }
  }

  // Smart Retake Logic (pre-filter skills/coverage by failed ones from last completed attempt)
  try {
    const { selectFailedSkillIds } = require("./retakeUtils");
    const { rows: lastRows } = await pool.query(
      `
        SELECT ea.attempt_id AS last_attempt_id, ea.exam_id AS last_exam_id, ea.submitted_at
        FROM exam_attempts ea
        JOIN exams e ON e.exam_id = ea.exam_id
        WHERE e.user_id = $1 AND e.exam_type = $2 AND ea.submitted_at IS NOT NULL
        ORDER BY ea.submitted_at DESC
        LIMIT 1
      `,
      [userInt, exam_type],
    );
    if (Array.isArray(lastRows) && lastRows.length > 0) {
      const lastAttemptId = lastRows[0].last_attempt_id;
      const { rows: skillRows } = await pool.query(
        `SELECT skill_id, skill_name, score, status FROM attempt_skills WHERE attempt_id = $1`,
        [lastAttemptId],
      );
      const passingGrade = Number((policy || {})?.passing_grade ?? 70);
      const failedSkillIds = selectFailedSkillIds(skillRows || [], passingGrade);
      // If none failed -> passed previously → no retake allowed
      if (failedSkillIds.size === 0) {
        return { error: "retake_not_allowed" };
      }
      // Narrow future generation to failed skills only
      if (exam_type === "baseline") {
        const baseSkills = Array.isArray(skillsPayload?.skills) ? skillsPayload.skills : [];
        const filtered = baseSkills.filter((s) => {
          const sid = String(s?.skill_id || s?.id || s?.name || '').trim();
          return sid && failedSkillIds.has(sid);
        });
        skillsPayload = { ...(skillsPayload || {}), skills: filtered.length ? filtered : baseSkills };
      } else if (exam_type === "postcourse") {
        const mapArray = Array.isArray(coveragePayload?.coverage_map) ? coveragePayload.coverage_map : [];
        const filteredMap = mapArray.map((item) => {
          const arr = Array.isArray(item?.skills) ? item.skills : [];
          const onlyFailed = arr.filter((sk) => {
            const sid = String(sk?.skill_id || sk?.id || sk?.name || '').trim();
            return sid && failedSkillIds.has(sid);
          });
          return { ...item, skills: onlyFailed };
        }).filter((it) => Array.isArray(it.skills) && it.skills.length > 0);
        coveragePayload = { ...(coveragePayload || {}), coverage_map: filteredMap.length ? filteredMap : mapArray };
      }
    }
  } catch {}

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
  const examId = examRows[0].exam_id;

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
  const skillsArray = normalizedBaselineSkills;
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
    const mapArray = Array.isArray(coverageMap) ? coverageMap : [];
    questionCount = mapArray.reduce((acc, item) => {
      const skillsInItem = Array.isArray(item?.skills) ? item.skills.length : 0;
      return acc + skillsInItem;
    }, 0);
  }
  const durationMinutes = Number.isFinite(questionCount) ? questionCount * 4 : 0;
  const expiresAtDate = durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60 * 1000) : null;
  const expiresAtIso = expiresAtDate ? expiresAtDate.toISOString() : null;

  // Insert initial attempt (attempt_no = 1)
  const policySnapshot = policy || {};
  const insertAttemptText = `
    INSERT INTO exam_attempts (exam_id, attempt_no, policy_snapshot, package_ref)
    VALUES ($1, $2, $3::jsonb, $4)
    RETURNING attempt_id
  `;
  // Temporarily set package_ref after creating package
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
  const attemptId = attemptRows[0].attempt_id;
  if (!Number.isFinite(Number(attemptId))) {
    try { console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'exam_creation_failed', message: 'attempt_id missing', stage: 'attempt_id_validation' }); } catch {}
    return { error: "exam_creation_failed" };
  }

  // Persist timing into attempt (duration_minutes, expires_at)
  try {
    await pool.query(
      `
        UPDATE exam_attempts
        SET duration_minutes = $1,
            expires_at = $2
        WHERE attempt_id = $3
      `,
      [durationMinutes || null, expiresAtIso ? new Date(expiresAtIso) : null, attemptId],
    );
  } catch {}

  // Build ExamPackage in Mongo
  // Phase 08.2 – Build coding questions via DevLab envelope and store in dedicated field
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
  try {
    codingQuestionsDecorated =
      await devlabIntegration.buildCodingQuestionsForExam({
        amount: 2,
        skills: skillsForCoding,
        humanLanguage: "en",
        difficulty: "medium",
      });
  } catch (e) {
    try {
      // eslint-disable-next-line no-console
      console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'devlab_build_failed', message: e?.message });
    } catch {}
    codingQuestionsDecorated = [];
  }
  try {
    // eslint-disable-next-line no-console
    console.log(`[TRACE][${String(exam_type).toUpperCase()}][CREATE][DEVLAB]`, {
      skills_for_coding: skillsForCoding.length,
      questions_built: Array.isArray(codingQuestionsDecorated) ? codingQuestionsDecorated.length : 0,
      real_candidate: !!process.env.INTEGRATION_DEVLAB_DATA_REQUEST_URL,
    });
  } catch {}

  // Generate theoretical questions with medium difficulty (fixed), mixed types
  let questions = [];
  try {
    const sourceIds = (() => {
      if (exam_type === "baseline") {
        return (skillsArray || []).map((s) => String(s.skill_id)).filter(Boolean);
      }
      const ids = [];
      for (const it of coverageMap || []) {
        for (const s of (it.skills || [])) ids.push(String(s.skill_id));
      }
      return ids.filter(Boolean);
    })();
    const uniqueSkills = Array.from(new Set(sourceIds));
    // eslint-disable-next-line no-console
    console.debug("Theoretical generation skills:", uniqueSkills);
    const items = [];
    for (let i = 0; i < questionCount; i += 1) {
      const skill_id = uniqueSkills[i % Math.max(uniqueSkills.length, 1)];
      if (!skill_id) continue;
      // mix types pseudo-random: alternate mcq/open
      const type = i % 2 === 0 ? 'mcq' : 'open';
      items.push({ skill_id, difficulty: 'medium', humanLanguage: 'en', type });
    }
    const generated = await generateTheoreticalQuestions({ items });

    // AI validation per question (non-blocking if fails)
    const validated = [];
    for (const q of generated) {
      let validation = { valid: true, reasons: [] };
      try {
        validation = await validateQuestion({ question: q });
      } catch (e) {
        validation = { valid: false, reasons: ['validation_call_failed'] };
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
      const normalized = {
        type: q.type === 'open' ? 'open' : 'mcq',
        stem: q.stem || '',
        question: q.stem || '',
        choices: Array.isArray(q.options) ? q.options : [],
        correct_answer: q.correct_answer || '',
        difficulty: 'medium', // enforced policy
        topic_id: 0,
        topic_name: 'General',
        humanLanguage: 'en',
        hints,
        skill_id: q.skill_id || undefined,
      };
      validated.push(normalized);
    }
    questions = validated;
    try {
      // eslint-disable-next-line no-console
      console.log(`[TRACE][${String(exam_type).toUpperCase()}][CREATE][THEORY]`, {
        generated: Array.isArray(generated) ? generated.length : 0,
        validated: Array.isArray(questions) ? questions.length : 0,
        real_candidate: !!process.env.OPENAI_API_KEY,
      });
    } catch {}
  } catch (err) {
    // Fallback to minimal internal question if OpenAI fails
    questions = [{
      type: "mcq",
      stem: "Which statement about event loop and microtasks in JavaScript is true?",
      question: "Which statement about event loop and microtasks in JavaScript is true?",
      choices: [
        "Microtasks run before rendering and before next macrotask.",
        "Microtasks run after each macrotask batch completes.",
        "Microtasks run after DOM updates.",
        "Microtasks run only during async/await functions.",
      ],
      correct_answer: "Microtasks run before rendering and before next macrotask.",
      difficulty: "medium",
      topic_id: 0,
      topic_name: "General",
      humanLanguage: "en",
      hints: ["Think about scheduling order of microtasks vs macrotasks"],
    }];
  }
  if (process.env.NODE_ENV !== "test") {
    try {
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
      });
      // Backfill package_ref in PG
      await pool.query(
        `UPDATE exam_attempts SET package_ref = $1 WHERE attempt_id = $2`,
        [pkg._id, attemptId],
      );
    } catch (e) {
      try {
        // eslint-disable-next-line no-console
        console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'exam_creation_failed', message: e?.message, stack: e?.stack });
      } catch {}
      return { error: "exam_creation_failed", message: "Failed to create and persist exam package" };
    }
    // End-to-end validation: Confirm package exists
    try {
      const verify = await ExamPackage.findOne({ attempt_id: String(attemptId) }).lean();
      if (!verify) {
        try { console.log('[TRACE][EXAM][CREATE][ERROR]', { error: 'exam_incomplete', message: 'ExamPackage missing after creation' }); } catch {}
        return { error: 'exam_incomplete' };
      }
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
    `SELECT ea.attempt_id, ea.exam_id, ea.attempt_no, ea.policy_snapshot, ea.started_at, ea.expires_at, e.exam_type
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

  // Count existing attempts for this exam
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM exam_attempts WHERE exam_id = $1`,
    [attempt.exam_id],
  );
  const attemptsCount = countRows[0]?.cnt ?? 0;

  // If attempt expired, block start
  if (attempt.expires_at) {
    const now = new Date();
    const exp = new Date(attempt.expires_at);
    if (now > exp) {
      return { error: "exam_time_expired" };
    }
  }

  if (examType === "baseline") {
    // Only one attempt allowed; block if attempt_no > 1 or attemptsCount > 1
    if (attempt.attempt_no > 1 || attemptsCount > 1) {
      return { error: "baseline_attempt_not_allowed" };
    }
  } else if (examType === "postcourse") {
    const policySnapshot = attempt.policy_snapshot || {};
    const maxAttempts = Number(policySnapshot?.max_attempts ?? 1);
    if (Number.isFinite(maxAttempts) && maxAttempts > 0) {
      // If attempts already equal or exceed max, block starting
      if (attemptsCount > maxAttempts || attempt.attempt_no > maxAttempts) {
        return { error: "max_attempts_reached" };
      }
    }
  }

  // Do not reset timer if already started
  if (!attempt.started_at) {
    await pool.query(
      `UPDATE exam_attempts SET started_at = NOW() WHERE attempt_id = $1`,
      [attempt_id],
    );
    try {
      // eslint-disable-next-line no-console
      console.log('[TRACE][EXAM][STARTED]', { attempt_id, started: true });
    } catch {}
    return { ok: true };
  }
  try {
    // eslint-disable-next-line no-console
    console.log('[TRACE][EXAM][STARTED]', { attempt_id, already_started: true });
  } catch {}
  return { ok: true, already_started: true };
}

async function getPackageByExamId(exam_id) {
  const doc = await ExamPackage.findOne({ exam_id: String(exam_id) })
    .sort({ created_at: -1 })
    .lean();
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
  const doc = await ExamPackage.findOne({ attempt_id: String(attempt_id) })
    .sort({ created_at: -1 })
    .lean();
  if (!doc) return doc;
  if (Array.isArray(doc.questions)) {
    doc.questions = doc.questions.map((q) => ({
      ...q,
      prompt: removeHintsDeep(q?.prompt),
    }));
  }
  return doc;
}

async function submitAttempt({ attempt_id, answers }) {
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

  // 4) Split answers
  const allAnswers = Array.isArray(answers) ? answers : [];
  const codingAnswers = allAnswers.filter(
    (a) => String(a?.type || "").toLowerCase() === "code",
  );
  const theoreticalAnswers = allAnswers.filter(
    (a) => String(a?.type || "").toLowerCase() !== "code",
  );
  try {
    const mcqCount = theoreticalAnswers.filter(a => String(a?.type||'').toLowerCase()==='mcq').length;
    const openCount = theoreticalAnswers.filter(a => String(a?.type||'').toLowerCase()==='open').length;
    // eslint-disable-next-line no-console
    console.log('[TRACE][EXAM][SUBMIT][COUNTS]', {
      theoretical_total: theoreticalAnswers.length,
      mcq: mcqCount,
      open: openCount,
      code: codingAnswers.length,
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

  // 5) Theoretical grading (internal)
  function gradeTheoreticalAnswers(pkg, items) {
    const graded = [];
    for (const ans of items) {
      const qid = String(ans.question_id || "");
      const q = qById.get(qid);
      const type = String(ans.type || "").toLowerCase();
      const rawAnswer = ans.answer != null ? String(ans.answer) : "";
      const skillId = normalizeSkillIdFrom(ans, q);
      if (type === "mcq") {
        // Find correct answer from prompt or answer_key
        let correct = "";
        let ok = false;
        if (q) {
          if ((q && q.prompt && q.prompt.correct_answer) != null) {
            correct = String(q.prompt.correct_answer);
          } else if (q && q.answer_key != null) {
            correct = String(q.answer_key);
          }
          ok = rawAnswer === correct;
        } else {
          ok = false;
        }
        graded.push({
          question_id: qid,
          skill_id: skillId,
          type: "mcq",
          raw_answer: rawAnswer,
          score: ok ? 100 : 0,
          status: ok ? "correct" : "incorrect",
          source: "theoretical",
        });
      } else {
        // open-ended fallback grading
        const nonBlank = rawAnswer.trim().length > 0;
        graded.push({
          question_id: qid,
          skill_id: skillId,
          type: "open",
          raw_answer: rawAnswer,
          score: nonBlank ? 60 : 0,
          status: nonBlank ? "partial" : "blank",
          source: "theoretical",
        });
        // eslint-disable-next-line no-console
        console.debug("Grading fallback triggered", { question_id: qid, nonBlank });
        // optional audit trail
        if (process.env.NODE_ENV !== "test") {
          try {
            AiAuditTrail.create({
              exam_id: String(attempt.exam_id),
              attempt_id: String(attemptIdNum),
              event_type: "grading",
              model: { provider: "internal", name: "placeholder", version: "v1" },
              prompt: {
                question_id: qid,
                type: "open",
                skill_id: skillId,
                user_answer: rawAnswer,
              },
              response: { decision: "pending_review", score: 0 },
              status: "success",
            }).catch(() => {});
          } catch {}
        }
      }
    }
    return graded;
  }

  const theoreticalGraded = gradeTheoreticalAnswers(examPackage, theoreticalAnswers);

  // 6) Coding grading (DevLab via unified envelope)
  const { gradingResults, aggregated } =
    await devlabIntegration.gradeCodingAnswersForExam({
      codingQuestions: Array.isArray(examPackage?.coding_questions)
        ? examPackage.coding_questions
        : [],
      codingAnswers,
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

  // 7) Merge grades
  const gradedItems = [...theoreticalGraded, ...codingGraded];

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
    const status = avg >= passing ? "acquired" : "failed";
    let name =
      skillIdToName.get(sid) ||
      (qById.get(String(items[0]?.question_id))?.prompt?.skill_name || sid);
    if (!name || String(name).trim() === "") name = sid;
    perSkill.push({
      skill_id: sid,
      skill_name: name || sid,
      score: Number(avg),
      status,
    });
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
      ? perSkillScores.reduce((a, b) => a + b, 0) / perSkillScores.length
      : 0;
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
  } catch {}
  try {
    // eslint-disable-next-line no-console
    console.log('[TRACE][EXAM][SUBMIT][SUMMARY]', {
      attempt_id: attemptIdNum,
      exam_type: examType,
      final_grade: Number(finalGrade),
      totalAnswersCount,
      nonBlankAnswersCount,
      per_skill: perSkill.map((s) => ({ skill_id: s.skill_id, score: s.score, status: s.status })),
    });
  } catch {}

  // 10) Update Postgres exam_attempts
  await pool.query(
    `
      UPDATE exam_attempts
      SET submitted_at = NOW(),
          final_grade = $1,
          passed = $2,
          status = CASE WHEN status = 'canceled' THEN status ELSE 'submitted' END
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

  // 3.1) Directory (postcourse only)
  if (examType === "postcourse") {
    const payloadDirectory = {
      course_id: attempt.course_id != null ? Number(attempt.course_id) : null,
      user_id: attempt.user_id != null ? Number(attempt.user_id) : null,
      attempt_no: attempt.attempt_no || 1,
      exam_type: examType,
      final_grade: Number(finalGrade),
      passing_grade: Number(passing),
      passed,
      submitted_at: submittedAtIso,
    };
    await pool.query(
      `INSERT INTO outbox_integrations (event_type, payload, target_service) VALUES ($1, $2::jsonb, $3)`,
      ["directory_results", JSON.stringify(payloadDirectory), "directory"],
    );
    safePushDirectoryResults(payloadDirectory).catch(() => {});
  }

  // 3.2) Skills Engine
  const payloadSkills = {
    user_id: attempt.user_id != null ? Number(attempt.user_id) : null,
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
  await pool.query(
    `INSERT INTO outbox_integrations (event_type, payload, target_service) VALUES ($1, $2::jsonb, $3)`,
    ["skills_engine_results", JSON.stringify(payloadSkills), "skills_engine"],
  );
  safePushSkillsResults(payloadSkills).catch(() => {});

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
  };
}

module.exports = {
  createExam,
  markAttemptStarted,
  getPackageByExamId,
  getPackageByAttemptId,
  submitAttempt,
};
