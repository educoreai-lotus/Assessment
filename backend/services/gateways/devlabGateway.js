function getCoordinatorUrl() {
	const base = process.env.COORDINATOR_URL;
	if (!base) throw new Error('COORDINATOR_URL not set');
	return String(base).replace(/\/+$/, '');
}

const { postToCoordinator } = require('./coordinatorClient');
const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

function buildEnvelope(payloadObj, responseTemplate) {
	const payload = payloadObj && typeof payloadObj === 'object' ? payloadObj : {};
	const response = responseTemplate && typeof responseTemplate === 'object' ? responseTemplate : { answer: '' };
	return {
		requester_service: SERVICE_NAME,
		payload,
		response,
	};
}

async function sendToDevlabEnvelope(payloadObj) {
	const envelope = buildEnvelope(payloadObj, { answer: [] });
	const { data: json } = await postToCoordinator(envelope).catch(() => ({ data: {} }));
	return json && json.success ? json.data : (json && json.response) || {};
}

async function requestCodingQuestions({ amount, skills, humanLanguage = 'en', difficulty = 'medium' }) {
	try {
		const resp = await sendToDevlabEnvelope({
			action: 'coding',
			amount,
			difficulty,
			humanLanguage,
			programming_language: 'javascript',
			skills,
		});
		const answer = Array.isArray(resp?.answer) ? resp.answer : (Array.isArray(resp?.response?.answer) ? resp.response.answer : []);
		const isEmpty = !Array.isArray(answer) || answer.length === 0;
		if (isEmpty) {
			try { console.log('[MOCK-FALLBACK][DevLab][coding-questions]', { amount, skills_count: Array.isArray(skills) ? skills.length : 0 }); } catch {}
			const { mockGetCodingQuestions } = require('../mocks/devlabMock');
			const mockResp = await mockGetCodingQuestions();
			return Array.isArray(mockResp?.questions) ? mockResp.questions : [];
		}
		return answer;
	} catch (err) {
		try { console.log('[MOCK-FALLBACK][DevLab][coding-questions][error]', { message: err?.message }); } catch {}
		const { mockGetCodingQuestions } = require('../mocks/devlabMock');
		const mockResp = await mockGetCodingQuestions();
		return Array.isArray(mockResp?.questions) ? mockResp.questions : [];
	}
}

async function sendCodingGradeEnvelope(payloadObj) {
	try {
		const resp = await sendToDevlabEnvelope(payloadObj);
		const answer = Array.isArray(resp?.answer) ? resp.answer : (Array.isArray(resp?.response?.answer) ? resp.response.answer : []);
		const isEmpty = !Array.isArray(answer) || answer.length === 0;
		if (isEmpty) {
			try { console.log('[MOCK-FALLBACK][DevLab][coding-grade]'); } catch {}
			const { mockGradeCodingAnswers } = require('../mocks/devlabMock');
			const mock = await mockGradeCodingAnswers(payloadObj || {});
			return Array.isArray(mock?.results) ? mock.results : [];
		}
		return answer;
	} catch (err) {
		try { console.log('[MOCK-FALLBACK][DevLab][coding-grade][error]', { message: err?.message }); } catch {}
		const { mockGradeCodingAnswers } = require('../mocks/devlabMock');
		const mock = await mockGradeCodingAnswers(payloadObj || {});
		return Array.isArray(mock?.results) ? mock.results : [];
	}
}

module.exports = { sendToDevlabEnvelope, requestCodingQuestions, sendCodingGradeEnvelope };
