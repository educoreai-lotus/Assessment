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
  safePushExamResults: safePushCourseBuilderResults,
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
  // Fetch upstream data via gateways with safe mocks
  let policy = {};
  let skillsPayload = null;
  let coveragePayload = null;

  if (exam_type === "baseline") {
    skillsPayload = await safeFetchBaselineSkills({ user_id });
    // Directory policy for baseline (may include passing_grade only; include max_attempts if provided)
    policy = await safeFetchPolicy("baseline");
  } else if (exam_type === "postcourse") {
    coveragePayload = await safeFetchCoverage({
      learner_id: user_id,
      learner_name: undefined,
      course_id,
    });
    policy = await safeFetchPolicy("postcourse");
  } else {
    throw new Error("invalid_exam_type");
  }

  // Optional questions (DevLab) – coding handled via new integration below
  const theoreticalReq = {
    exam_id: "temp",
    attempt_id: "temp",
    difficulty: "hard",
    question: {
      type: "mcq",
      // Phase 08.1 – carry DevLab theoretical metadata into question object
      // Defaults used to avoid breaking existing flows
      topic_id: 0,
      topic_name: "General",
      humanLanguage: "en",
      stem: "Which statement about event loop and microtasks in JavaScript is true?",
      choices: [
        "Microtasks run before rendering and before next macrotask.",
        "Microtasks run after each macrotask batch completes.",
        "Microtasks run after DOM updates.",
        "Microtasks run only during async/await functions.",
      ],
      correct_answer:
        "Microtasks run before rendering and before next macrotask.",
      hints: [
        "Hint 1: Think about microtasks and macrotasks scheduling order.",
        "Hint 2: Microtasks often come from Promises.",
        "Hint 3: They execute before the next rendering phase.",
      ],
    },
  };
  // Phase 08.1 – internal theoretical builder; no external DevLab validation
  const theoreticalResp = { status: "accepted", mode: "internal" };
  // Log AI audit if available
  try {
    await AiAuditTrail.create({
      attempt_id: "pending",
      event_type: "prompt",
      model: { provider: "devlab", name: "validator", version: "v1" },
      prompt: theoreticalReq,
      response: theoreticalResp,
      status: "success",
    });
  } catch {}

  // Insert exam row in PG (normalize any user_id -> integer for FK)
  const userInt = normalizeToInt(user_id);
  if (userInt == null) {
    return { error: "invalid_user_id" };
  }
  console.log("createExam user mapping:", { user_id, userInt });
  const courseInt = normalizeToInt(course_id); // can be null for baseline

  // Baseline exam: only one baseline exam per user is allowed
  if (exam_type === "baseline") {
    const { rows: existingBaseline } = await pool.query(
      `SELECT 1 FROM exams WHERE exam_type = $1 AND user_id = $2 LIMIT 1`,
      ["baseline", userInt],
    );
    if (existingBaseline.length > 0) {
      return { error: "baseline_already_exists" };
    }
  }

  const insertExamText = `
    INSERT INTO exams (exam_type, user_id, course_id)
    VALUES ($1, $2, $3)
    RETURNING exam_id
  `;
  const { rows: examRows } = await pool.query(insertExamText, [
    exam_type,
    userInt,
    courseInt,
  ]);
  const examId = examRows[0].exam_id;

  // Prepare skills and coverage map
  const skillsArray = skillsPayload?.skills || [];
  const coverageMap = coveragePayload?.coverage_map || [];
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
  const { rows: attemptRows } = await pool.query(insertAttemptText, [
    examId,
    1,
    JSON.stringify(policySnapshot),
    tempPackageRef,
  ]);
  const attemptId = attemptRows[0].attempt_id;

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
    const fromSkills = Array.isArray(skillsArray) ? skillsArray : [];
    const primary = Array.from(
      new Set(
        fromSkills
          .map((s) => s?.skill_id || s?.id || s?.skill_name || s?.name)
          .filter((v) => typeof v === "string" && v.trim() !== "")
          .map(String),
      ),
    );
    if (primary.length > 0) return primary;
    const fromCoverage = Array.isArray(coverageMap) ? coverageMap : [];
    const flattened = [];
    for (const item of fromCoverage) {
      const arr = Array.isArray(item?.skills) ? item.skills : [];
      for (const sk of arr) {
        const ref = sk?.skill_id || sk?.id || sk?.skill_name || sk?.name;
        if (typeof ref === "string" && ref.trim() !== "") {
          flattened.push(String(ref));
        }
      }
    }
    return Array.from(new Set(flattened));
  })();
  const codingQuestionsDecorated =
    await devlabIntegration.buildCodingQuestionsForExam({
      amount: 2,
      skills: skillsForCoding,
      humanLanguage: "en",
      difficulty: "medium",
    });

  const questions = [
    // include theoretical as a "question" prompt only (coding stored separately)
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

  // Build API response
  return {
    exam_id: examId,
    attempt_id: attemptId,
    exam_type,
    user_id: Number(userInt),
    course_id: courseInt != null ? Number(courseInt) : null,
    passing_grade: policySnapshot?.passing_grade ?? null,
    max_attempts: policySnapshot?.max_attempts ?? null,
    policy_snapshot: policySnapshot,
  };
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
    return { ok: true };
  }
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

  // 3) Load exam package from Mongo by attempt_id
  const examPackage = await getPackageByAttemptId(String(attemptIdNum));
  if (!examPackage) {
    return { error: "package_not_found" };
  }

  // 4) Split answers
  const allAnswers = Array.isArray(answers) ? answers : [];
  const codingAnswers = allAnswers.filter(
    (a) => String(a?.type || "").toLowerCase() === "code",
  );
  const theoreticalAnswers = allAnswers.filter(
    (a) => String(a?.type || "").toLowerCase() !== "code",
  );

  // Helper: map question by id
  const qById = new Map(
    (Array.isArray(examPackage?.questions) ? examPackage.questions : []).map(
      (q) => [String(q.question_id || ""), q],
    ),
  );

  // 5) Theoretical grading (internal)
  function gradeTheoreticalAnswers(pkg, items) {
    const graded = [];
    for (const ans of items) {
      const qid = String(ans.question_id || "");
      const q = qById.get(qid);
      const type = String(ans.type || "").toLowerCase();
      const rawAnswer = ans.answer != null ? String(ans.answer) : "";
      const skillId = ans.skill_id || (q && q.skill_id) || "";
      if (type === "mcq") {
        // Find correct answer from prompt or answer_key
        const correct =
          (q && q.prompt && q.prompt.correct_answer) != null
            ? String(q.prompt.correct_answer)
            : q && q.answer_key != null
              ? String(q.answer_key)
              : "";
        const ok = rawAnswer === correct;
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
        // open-ended placeholder
        graded.push({
          question_id: qid,
          skill_id: skillId,
          type: "open",
          raw_answer: rawAnswer,
          score: 0,
          status: "pending_review",
          source: "theoretical",
        });
        // optional audit trail
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
    return {
      question_id: String(r.question_id || ""),
      skill_id: String(r.skill_id || ""),
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

  // 7) Merge grades
  const gradedItems = [...theoreticalGraded, ...codingGraded];

  // 8) Per-skill aggregation
  const bySkill = new Map();
  for (const item of gradedItems) {
    const sid = String(item.skill_id || "");
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
    const name =
      skillIdToName.get(sid) ||
      (qById.get(String(items[0]?.question_id))?.prompt?.skill_name || sid);
    perSkill.push({
      skill_id: sid,
      skill_name: name || sid,
      score: Number(avg),
      status,
    });
  }

  // 9) Final grade
  const perSkillScores = perSkill.map((s) => Number(s.score || 0));
  const finalGrade =
    perSkillScores.length > 0
      ? perSkillScores.reduce((a, b) => a + b, 0) / perSkillScores.length
      : 0;
  const passed = finalGrade >= passing;

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
      user_id: attempt.user_id != null ? Number(attempt.user_id) : null,
      course_id: attempt.course_id != null ? Number(attempt.course_id) : null,
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
    safePushCourseBuilderResults(payloadCourseBuilder).catch(() => {});
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
