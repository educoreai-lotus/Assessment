const axios = require('axios');

function getDevlabUrl() {
	const url = process.env.INTEGRATION_DEVLAB_DATA_REQUEST_URL;
	if (!url) throw new Error('INTEGRATION_DEVLAB_DATA_REQUEST_URL not set');
	return url;
}

async function sendToDevlabEnvelope(payloadObj) {
	const url = getDevlabUrl();
	const envelope = {
		service_requester: 'Assessment',
		payload: payloadObj || {},
		response: {},
	};
	const { data } = await axios.post(url, envelope, { timeout: 20000 });
	return data;
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
	// Expect envelope with response.answer
	return Array.isArray(resp?.response?.answer) ? resp.response.answer : [];
}

async function sendCodingGradeEnvelope(payloadObj) {
	const resp = await sendToDevlabEnvelope(payloadObj);
	return Array.isArray(resp?.response?.answer) ? resp.response.answer : [];
}

module.exports = { sendToDevlabEnvelope, requestCodingQuestions, sendCodingGradeEnvelope };
