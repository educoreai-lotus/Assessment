// Phase 08.2 – Build coding questions using unified envelope via gateway
const devlabGateway = require('../gateways/devlabGateway');
const aiGateway = require('../gateways/aiGateway');

// In-memory store for DevLab theoretical correct answers (non-persistent; process-scoped)
const _devlabTheoryStore = new Map(); // key: question_id, value: { correct_answer: string }

exports.buildCodingQuestionsForExam = async ({
  amount,
  skills,
  humanLanguage = 'en',
  difficulty = 'medium',
}) => {
  let codingQuestions = [];
  try {
    codingQuestions = await devlabGateway.requestCodingQuestions({
      amount,
      skills,
      humanLanguage,
      difficulty,
    });
  } catch (err) {
    try {
      const { mockGetCodingQuestions } = require('../mocks/devlabMock');
      const mockResp = await mockGetCodingQuestions();
      const arr = Array.isArray(mockResp?.questions) ? mockResp.questions : [];
      codingQuestions = arr;
    } catch {
      codingQuestions = [];
    }
  }
  const now = new Date();
  return (codingQuestions || []).map((q) => {
    const questionText =
      (typeof q?.question === 'string' && q.question) ||
      (typeof q?.stem === 'string' && q.stem) ||
      'Solve the coding task as described.';
    return {
      ...q,
      question: questionText,
      expected_output: typeof q?.expected_output === 'string' ? q.expected_output : (q?.expected_output ?? ''),
      test_cases: Array.isArray(q?.test_cases) ? q.test_cases : [],
      skills,
      humanLanguage,
      programming_language: q?.programming_language || 'javascript',
      difficulty,
      requested_at: now,
    };
  });
};

// Phase 08.3 – Prepare grading payload (placeholder for upcoming implementation)
exports.prepareCodingGradingPayload = function prepareCodingGradingPayload({
	exam_id,
	attempt_id,
	user_id,
	answers,
}) {
	return {
		exam_id: exam_id != null ? String(exam_id) : null,
		attempt_id: attempt_id != null ? String(attempt_id) : null,
		user_id: user_id != null ? String(user_id) : null,
		answers: Array.isArray(answers)
			? answers.map((a) => ({
					question_id: String(a.question_id || ''),
					skill_id: String(a.skill_id || ''),
					code_answer: a.code_answer != null ? String(a.code_answer) : '',
			  }))
			: [],
	};
};

// Optional helper to normalize DevLab envelope responses
exports.decorateDevLabResponse = function decorateDevLabResponse(resp) {
	if (!resp) return { results: [] };
	if (Array.isArray(resp.results)) return resp;
	// If envelope returned raw array
	if (Array.isArray(resp)) return { results: resp };
	// Unknown shape
	return { results: [] };
};

// Phase 08.3 – Grade coding answers via DevLab envelope
exports.gradeCodingAnswersForExam = async function gradeCodingAnswersForExam({
	codingQuestions,
	codingAnswers,
}) {
	const questions = Array.isArray(codingQuestions) ? codingQuestions : [];
	const answers = Array.isArray(codingAnswers) ? codingAnswers : [];

	// Build simple finder by skill_id; fallback to first question
	function findQuestionForAnswer(ans) {
		const skillId = String(ans?.skill_id || '').trim();
		if (skillId) {
			const match = questions.find((q) =>
				Array.isArray(q?.skills) ? q.skills.map(String).includes(skillId) : false,
			);
			if (match) return match;
		}
		return questions[0] || null;
	}

	const answersPayload = answers
		.map((a) => {
			const q = findQuestionForAnswer(a);
			if (!q) return null;
			return {
				question_id: String(a.question_id || ''),
				skill_id: String(a.skill_id || ''),
				code_answer: a.answer != null ? String(a.answer) : '',
				expected_output: q?.expected_output ?? '',
				test_cases: Array.isArray(q?.test_cases) ? q.test_cases : [],
				programming_language: q?.programming_language || 'javascript',
			};
		})
		.filter(Boolean);

	if (!answersPayload.length) {
		return {
			gradingResults: [],
			aggregated: { score_total: 0, max_total: 0 },
		};
	}

	const programming_language =
		answersPayload[0].programming_language || 'javascript';

	const gradingPayload = {
		action: 'gradeCoding',
		programming_language,
		answers: answersPayload,
	};

  let gradingResults = [];
  try {
    gradingResults =
      (await devlabGateway.sendCodingGradeEnvelope(gradingPayload)) || [];
  } catch (err) {
    try {
      const { mockGradeCodingAnswers } = require('../mocks/devlabMock');
      const mock = await mockGradeCodingAnswers(gradingPayload);
      const results = Array.isArray(mock?.results) ? mock.results : [];
      // Normalize mock results to include max_score for downstream scaling
      gradingResults = results.map((r) => ({
        question_id: String(r.question_id || ''),
        skill_id: String(r.skill_id || ''),
        score: typeof r.score === 'number' ? r.score : 0,
        max_score: 100,
        status: r.status || 'failed',
      }));
    } catch {
      gradingResults = [];
    }
  }
  // Normalize results from Coordinator/gateway to include max_score for scaling
  gradingResults = (Array.isArray(gradingResults) ? gradingResults : []).map((r) => ({
    question_id: String(r?.question_id || ''),
    skill_id: String(r?.skill_id || ''),
    score: typeof r?.score === 'number' ? r.score : 0,
    max_score: typeof r?.max_score === 'number' ? r.max_score : 100,
    status: r?.status || 'failed',
  }));

	let score_total = 0;
	let score_max = 0;
	for (const r of gradingResults || []) {
		const s = typeof r.score === 'number' ? r.score : 0;
		const m = typeof r.max_score === 'number' ? r.max_score : 1;
		score_total += s;
		score_max += m;
	}

	return {
		gradingResults,
		aggregated: { score_total, max_total: score_max },
	};
};

// Build DevLab theoretical questions using AI gateway
async function buildTheoreticalQuestionsForDevLab({
  topic_id,
  topic_name,
  skills,
  amount,
  question_type,
  humanLanguage,
}) {
  const params = {
    topic_id,
    topic_name,
    skills: Array.isArray(skills) ? skills : [],
    amount: Number.isFinite(Number(amount)) && Number(amount) > 0 ? Number(amount) : 1,
    question_type,
    humanLanguage: humanLanguage || 'en',
  };
  const out = await aiGateway.generateDevLabTheoreticalQuestions(params);
  // Normalize minimal shape (pass-through is fine; fields already normalized in gateway)
  return Array.isArray(out) ? out : [];
}
exports.buildTheoreticalQuestionsForDevLab = buildTheoreticalQuestionsForDevLab;

// Build a FULL AJAX-enabled DevLab theoretical package
async function buildTheoreticalQuestionsPackageForDevlab({
  topic_id,
  topic_name,
  skills,
  amount,
  humanLanguage,
  theoretical_question_type,
}) {
  const generated = await aiGateway.generateDevLabTheoreticalQuestions({
    topic_id,
    topic_name,
    skills,
    amount,
    humanLanguage,
    question_type: theoretical_question_type,
  });
  const questions = (Array.isArray(generated) ? generated : []).map((q) => {
    const id = String(q?.id || '');
    const stem = String(q?.stem || '');
    const options = Array.isArray(q?.options) ? q.options : [];
    const correct_answer = q?.correct_answer != null ? String(q.correct_answer) : '';
    const explanation = q?.explanation != null ? String(q.explanation) : '';
    const hints = Array.isArray(q?.hints) ? q.hints.map(String) : [];
    const type = String(q?.type || 'mcq').toLowerCase() === 'open' ? 'open' : 'mcq';
    const difficulty = String(q?.difficulty || '').toLowerCase();
    const skill_id = String(q?.skill_id || '');

    // Store correct answers in memory for grading callback
    if (id) {
      _devlabTheoryStore.set(id, { correct_answer });
    }

    return {
      id,
      type,
      difficulty,
      skill_id,
      topic_id,
      topic_name,
      stem,
      options,
      explanation,
      hints,
      html_snippet: `
      <div class="question-card">
        <p>${stem}</p>
        <input id="answer_${id}" />
        <button id="check_${id}">Check</button>
        <div id="result_${id}"></div>
      </div>
    `,
      javascript_snippet: `
      document.getElementById("check_${id}").addEventListener("click", async () => {
        const ans = document.getElementById("answer_${id}").value.trim();
        const resBox = document.getElementById("result_${id}");
        const envelope = JSON.stringify({
          requester_service: "devlab-service",
          payload: {
            action: "grade-theoretical",
            question_id: "${id}",
            user_answer: ans
          },
          response: { answer: "" }
        });
        const result = await fetch("/api/fill-content-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: envelope
        }).then(r => r.json()).catch(()=>null);
        try {
          const parsed = typeof result === 'string' ? JSON.parse(result) : result;
          const correct = parsed?.data?.correct === true || parsed?.response?.answer?.correct === true || parsed?.correct === true;
          resBox.textContent = correct ? "Correct!" : "Try again";
        } catch {
          resBox.textContent = "Try again";
        }
      });
    `,
      ajax_request_example: `
      const envelope = JSON.stringify({
        requester_service: "devlab-service",
        payload: {
          action: "grade-theoretical",
          question_id: "${id}",
          user_answer: "ANSWER"
        },
        response: { answer: "" }
      });
      fetch("/api/fill-content-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: envelope
      });
    `,
    };
  });
  // Aggregate HTML and JS for convenience (single block)
  const html_snippet = questions.map((q) => String(q.html_snippet || '')).join('\n');
  const javascript_snippet = [
    '(function(){',
    ...questions.map((q) => String(q.javascript_snippet || '')),
    '})();',
  ].join('\n');
  const ajax_request_example = `
  const envelope = JSON.stringify({
    requester_service: "devlab-service",
    payload: { action: "grade-theoretical", question_id: "${(questions[0] && questions[0].id) || 'QID'}", user_answer: "ANSWER" },
    response: { answer: "" }
  });
  fetch("/api/fill-content-metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: envelope
  });
`.trim();
  return { questions, html_snippet, javascript_snippet, ajax_request_example };
}
exports.buildTheoreticalQuestionsPackageForDevlab = buildTheoreticalQuestionsPackageForDevlab;

// Grade a DevLab theoretical answer using in-memory store
function gradeDevLabTheoreticalAnswer({ question_id, user_answer }) {
  const record = _devlabTheoryStore.get(String(question_id || ''));
  const correct = record ? String(record.correct_answer || '') : '';
  const ans = user_answer != null ? String(user_answer) : '';
  return { correct: ans === correct };
}
exports.gradeDevLabTheoreticalAnswer = gradeDevLabTheoreticalAnswer;

// Phase 08.6 – Universal inbound handler
exports.handleInbound = async (payload, context = {}) => {
  try {
    const action = String(payload?.action || '').toLowerCase();
    const requester = String(context?.requester_service || '').toLowerCase();

    // 1) Generate theoretical questions with HTML/JS package
    if (action === 'generate-questions') {
      // DevLab INTERNAL MODE: allow difficulty distribution (no override here)
      // This path intentionally uses generateDevLabTheoreticalQuestions which may vary difficulty.
      const topic_id = payload?.topic_id != null ? payload.topic_id : undefined;
      const topic_name = typeof payload?.topic_name === 'string' ? payload.topic_name : undefined;
      const skills = Array.isArray(payload?.skills) ? payload.skills.map(String) : [];
      const amount = Number.isFinite(Number(payload?.amount)) ? Number(payload.amount) : 1;
      const humanLanguage = typeof payload?.humanLanguage === 'string' ? payload.humanLanguage : 'en';
      const theoretical_question_type = typeof payload?.theoretical_question_type === 'string'
        ? payload.theoretical_question_type
        : undefined;

      const pkg = await exports.buildTheoreticalQuestionsPackageForDevlab({
        topic_id,
        topic_name,
        skills,
        amount,
        humanLanguage,
        theoretical_question_type,
      });
      // Return the package as the answer; controller wraps into { response: { answer } }
      return pkg || { questions: [] };
    }

    // 2) Grade theoretical answer using in-memory store
    if (action === 'grade-theoretical') {
      const question_id = String(payload?.question_id || '');
      const user_answer = payload?.user_answer != null ? String(payload.user_answer) : '';
      const { correct } = gradeDevLabTheoreticalAnswer({ question_id, user_answer });
      return { correct };
    }

    // 3) Coding questions build
    if (action === 'coding' || action === 'exam' || action === 'assessment') {
      const amount = Number.isFinite(Number(payload?.amount)) ? Number(payload.amount) : 1;
      const skills = Array.isArray(payload?.skills) ? payload.skills.map(String) : [];
      const humanLanguage = typeof payload?.humanLanguage === 'string' ? payload.humanLanguage : 'en';
      // EXAM MODE: force medium difficulty regardless of request
      const difficulty = 'medium';
      const built = await exports.buildCodingQuestionsForExam({
        amount,
        skills,
        humanLanguage,
        difficulty,
      });
      return Array.isArray(built) ? built : [];
    }

    // 4) Coding grading
    if (action === 'gradecoding' || action === 'grade-coding') {
      const answers = Array.isArray(payload?.answers) ? payload.answers : [];
      // Optional: include questions for richer grading context (test cases, expected output)
      const codingQuestions = Array.isArray(payload?.questions)
        ? payload.questions
        : (Array.isArray(payload?.coding_questions) ? payload.coding_questions : []);
      const { gradingResults, aggregated } = await exports.gradeCodingAnswersForExam({
        codingQuestions,
        codingAnswers: answers,
      });
      return { results: gradingResults, aggregated };
    }

    // Unsupported action: return empty answer for compatibility
    return [];
  } catch {
    return [];
  }
};


