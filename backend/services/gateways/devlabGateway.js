function getCoordinatorUrl() {
	const base = process.env.COORDINATOR_URL;
	if (!base) throw new Error('COORDINATOR_URL not set');
	return String(base).replace(/\/+$/, '');
}

const { sendToCoordinator } = require('../integrations/envelopeSender');
const { buildDevLabCodingRequestPayload, buildDevLabGradePayload } = require('../integrations/payloadBuilders/devlab.payload');
const SERVICE_NAME = process.env.SERVICE_NAME || 'assessment-service';

function buildEnvelope(payloadObj) {
	const payload = payloadObj && typeof payloadObj === 'object' ? payloadObj : {};
	return {
		requester_service: SERVICE_NAME,
		payload,
		response: { answer: '' },
	};
}

async function sendToDevlabEnvelope(payloadObj) {
	const envelope = buildEnvelope(payloadObj);
	const { data: json } = await sendToCoordinator({ targetService: 'devlab', payload: envelope.payload }).catch(() => ({ data: {} }));
	// Prefer new format: { success: true, data: { questions: [...] } }
	if (json && json.success && json.data && Array.isArray(json.data.questions)) {
		return json.data.questions;
	}
	// Backward compatibility with { response: { answer: [...] } } or { answer: [...] }
	if (Array.isArray(json?.response?.answer)) return json.response.answer;
	if (Array.isArray(json?.answer)) return json.answer;
	// Fallback
	return [];
}

async function requestCodingQuestions({ amount, skills, humanLanguage = 'en', difficulty = 'medium' }) {
	try {
		const shaped = buildDevLabCodingRequestPayload({ amount, skills, humanLanguage, difficulty });
		const resp = await sendToDevlabEnvelope(shaped);
		// resp may already be an array (new behavior) or an envelope with answer arrays (legacy)
		const answer = Array.isArray(resp) ? resp : (Array.isArray(resp?.answer) ? resp.answer : (Array.isArray(resp?.response?.answer) ? resp.response.answer : []));
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
		const shaped = buildDevLabGradePayload(payloadObj || {});
		const resp = await sendToDevlabEnvelope(shaped);
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
