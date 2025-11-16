// Phase 08.2 – Build coding questions using unified envelope via gateway
const devlabGateway = require('../gateways/devlabGateway');

exports.buildCodingQuestionsForExam = async ({
  amount,
  skills,
  humanLanguage = 'en',
  difficulty = 'medium',
}) => {
  const codingQuestions = await devlabGateway.requestCodingQuestions({
    amount,
    skills,
    humanLanguage,
    difficulty,
  });
  const now = new Date();
  return (codingQuestions || []).map((q) => ({
    ...q,
    skills,
    humanLanguage,
    programming_language: 'javascript',
    difficulty,
    requested_at: now,
  }));
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

	const gradingResults =
		(await devlabGateway.sendCodingGradeEnvelope(gradingPayload)) || [];

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

// Phase 08.6 – Universal inbound handler
exports.handleInbound = async (payload, responseTemplate) => {
	const resp =
		typeof responseTemplate === 'object' && responseTemplate !== null
			? responseTemplate
			: {};
	return { ...resp };
};


