function getCoordinatorUrl() {
	const base = process.env.COORDINATOR_URL;
	if (!base) throw new Error('COORDINATOR_URL not set');
	return String(base).replace(/\/+$/, '');
}

async function sendToDevlabEnvelope(payloadObj) {
	const url = `${getCoordinatorUrl()}/api/fill-content-metrics/`;
	const envelope = {
		requester_service: 'assessment-service',
		payload: payloadObj || {},
		response: { answer: [] },
	};
	const resp = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(envelope),
	});
	const json = await resp.json().catch(() => ({}));
	return json && json.success ? json.data : (json && json.response) || {};
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
	// Expect array of questions under response.answer or data.answer
	const answer = Array.isArray(resp?.answer) ? resp.answer : (Array.isArray(resp?.response?.answer) ? resp.response.answer : []);
	return answer;
}

async function sendCodingGradeEnvelope(payloadObj) {
	const resp = await sendToDevlabEnvelope(payloadObj);
	const answer = Array.isArray(resp?.answer) ? resp.answer : (Array.isArray(resp?.response?.answer) ? resp.response.answer : []);
	return answer;
}

module.exports = { sendToDevlabEnvelope, requestCodingQuestions, sendCodingGradeEnvelope };
