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
	// Phase 08.3 – Ensure requester_service='assessment' and include programming_language
	const answer = await sendToDevlabEnvelope(
		{
			action: 'coding',
			amount,
			difficulty,
			humanLanguage,
			programming_language: 'javascript',
			skills,
		},
		'assessment',
	);
	return answer;
}

// Phase 08.3 – Coding grading envelope (requester_service='assessment')
async function sendCodingGradeEnvelope(payload) {
	const url = process.env.INTEGRATION_DEVLAB_DATA_REQUEST_URL;
	if (!url) throw new Error('INTEGRATION_DEVLAB_DATA_REQUEST_URL not set');
	const body = {
		requester_service: 'assessment',
		payload,
		response: { answer: '' },
	};
	const { data } = await axios.post(url, body, { timeout: 20000 });
	return data?.response?.answer || [];
}

module.exports = {
	sendToDevlabEnvelope,
	requestCodingQuestions,
	sendCodingGradeEnvelope,
};
