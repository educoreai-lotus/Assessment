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


