const axios = require('axios');

function getDevlabUrl() {
	const url = process.env.INTEGRATION_DEVLAB_DATA_REQUEST_URL;
	if (!url) throw new Error('INTEGRATION_DEVLAB_DATA_REQUEST_URL not set');
	return url;
}

// Global Protocol: requester_service='assessment', payload/response are stringified
async function sendToDevlabEnvelope(payloadObj) {
	const url = getDevlabUrl();
	const body = {
		requester_service: 'assessment',
		payload: JSON.stringify(payloadObj || {}),
		response: JSON.stringify({ answer: [] }),
	};
	const { data } = await axios.post(url, body, { timeout: 20000 });
	const raw = data?.response ?? null;
	if (typeof raw === 'string') {
		try {
			const parsed = JSON.parse(raw);
			// DevLab responses often shape as { answer: [...] }
			if (parsed && Array.isArray(parsed.answer)) return parsed.answer;
			return parsed;
		} catch {
			return raw;
		}
	}
	return raw;
}

async function requestCodingQuestions({ amount, skills, humanLanguage = 'en', difficulty = 'medium' }) {
	const resp = await sendToDevlabEnvelope({
		action: 'coding',
		amount,
		difficulty,
		humanLanguage,
		programming_language: 'javascript',
		skills,
	});
	// Return array of questions directly if available
	return Array.isArray(resp) ? resp : (resp?.answer || []);
}

async function sendCodingGradeEnvelope(payloadObj) {
	const resp = await sendToDevlabEnvelope(payloadObj);
	// Return grading array if available
	return Array.isArray(resp) ? resp : (resp?.answer || []);
}

module.exports = { sendToDevlabEnvelope, requestCodingQuestions, sendCodingGradeEnvelope };
