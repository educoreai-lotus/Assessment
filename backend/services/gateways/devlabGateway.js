const axios = require('axios');

// Phase 08 – Unified envelope (Assessment → DevLab → Assessment)
async function sendToDevlabEnvelope(payload, requesterService = 'Devlab') {
	const url = process.env.INTEGRATION_DEVLAB_DATA_REQUEST_URL;
	if (!url) {
		throw new Error('INTEGRATION_DEVLAB_DATA_REQUEST_URL not set');
	}
	const body = {
		requester_service: requesterService,
		payload,
		response: { answer: '' },
	};
	const { data } = await axios.post(url, body, { timeout: 15000 });
	return data?.response?.answer;
}

async function requestCodingQuestions({ amount, skills, humanLanguage = 'en', difficulty = 'medium' }) {
	const answer = await sendToDevlabEnvelope(
		{
			action: 'coding',
			amount,
			difficulty,
			humanLanguage,
			skills,
		},
		'Devlab',
	);
	return answer;
}

// Optional for Phase 08.3
async function sendCodingGradeEnvelope(params) {
	// params: { exam_id, attempt_id, user_id, answers: [{question_id, skill_id, code_answer}] }
	const answer = await sendToDevlabEnvelope(
		{
			action: 'coding_grade',
			...params,
		},
		'Devlab',
	);
	return answer;
}

module.exports = {
	sendToDevlabEnvelope,
	requestCodingQuestions,
	sendCodingGradeEnvelope,
};
