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
	const { data: json } = await sendToCoordinator({ targetService: 'devlab-service', payload: envelope.payload }).catch(() => ({ data: {} }));
	// Prefer new format: { success: true, data: { questions: [...] } }
	if (json && json.success && json.data && Array.isArray(json.data.questions)) {
		return json.data.questions;
	}
	// Backward compatibility:
	// - response.answer may be a JSON string or an array/object
	// - response.answers may be HTML string (widget) -> not used here
	// - top-level answer may exist too
	try {
		if (typeof json?.response?.answer === 'string') {
			const parsed = JSON.parse(json.response.answer);
			if (Array.isArray(parsed?.questions)) return parsed.questions;
			if (Array.isArray(parsed?.results)) return parsed.results;
			if (Array.isArray(parsed)) return parsed;
		}
	} catch {}
	if (Array.isArray(json?.response?.answer)) return json.response.answer;
	try {
		if (typeof json?.answer === 'string') {
			const parsed = JSON.parse(json.answer);
			if (Array.isArray(parsed?.questions)) return parsed.questions;
			if (Array.isArray(parsed?.results)) return parsed.results;
			if (Array.isArray(parsed)) return parsed;
		}
	} catch {}
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
		let answer = [];
		if (Array.isArray(resp)) {
			answer = resp;
		} else if (Array.isArray(resp?.answer)) {
			answer = resp.answer;
		} else if (Array.isArray(resp?.response?.answer)) {
			answer = resp.response.answer;
		} else if (typeof resp?.response?.answer === 'string') {
			try {
				const parsed = JSON.parse(resp.response.answer);
				if (Array.isArray(parsed?.results)) answer = parsed.results;
				else if (Array.isArray(parsed)) answer = parsed;
			} catch {}
		} else if (typeof resp === 'string') {
			try {
				const parsed = JSON.parse(resp);
				if (Array.isArray(parsed?.results)) answer = parsed.results;
				else if (Array.isArray(parsed)) answer = parsed;
			} catch {}
		}
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

// Request DevLab widget HTML (or URL) for coding questions session
async function requestCodingWidgetHtml({ attempt_id, skills, difficulty = 'medium', amount = 2, humanLanguage = 'en' }) {
	try {
		const payload = {
			action: 'coding',
			attempt_id,
			skills: Array.isArray(skills) ? skills : [],
			difficulty,
			amount,
			humanLanguage,
			programming_language: 'javascript',
      // explicit routing + classification for Coordinator
      route: { destination: 'devlab', strict: true },
      content: { type: 'coding' },
		};
		const { data: json } = await sendToCoordinator({ targetService: 'devlab-service', payload }).catch(() => ({ data: {} }));
		// Expected modern format: include widget + questions
		if (json && json.success && json.data) {
			const html = typeof json.data.html === 'string' ? json.data.html : null;
			const url = typeof json.data.url === 'string' ? json.data.url : null;
			const session_token = typeof json.data.session_token === 'string' ? json.data.session_token : null;
			const questions = Array.isArray(json.data.questions) ? json.data.questions : [];
			return { html, url, session_token, questions };
		}
		// Legacy: try response.answers (HTML) and response.answer (JSON string or object)
		let html = typeof json?.response?.answers === 'string' ? json.response.answers : null;
		let url = typeof json?.response?.url === 'string' ? json.response.url : null;
		let session_token = typeof json?.response?.session_token === 'string' ? json.response.session_token : null;
		let questions = Array.isArray(json?.response?.questions) ? json.response.questions : [];
		// Parse response.answer if it is a JSON string or object
		if (json?.response?.answer) {
			try {
				const parsed = typeof json.response.answer === 'string' ? JSON.parse(json.response.answer) : json.response.answer;
				if (parsed && typeof parsed === 'object') {
					if (!html && typeof parsed.html === 'string') html = parsed.html;
					if (!url && typeof parsed.url === 'string') url = parsed.url;
					if (!session_token && typeof parsed.session_token === 'string') session_token = parsed.session_token;
					if (Array.isArray(parsed.questions)) questions = parsed.questions;
					else if (!questions.length && Array.isArray(parsed.results)) questions = parsed.results;
				} else if (Array.isArray(parsed)) {
					questions = parsed;
				}
			} catch { /* ignore parse errors */ }
		}
		if (html || url || (questions && questions.length > 0) || session_token) return { html, url, session_token, questions };
	} catch (err) {
		try { console.log('[MOCK-FALLBACK][DevLab][coding-widget][error]', { message: err?.message }); } catch {}
	}
	// Fallback: return nothing; UI will render only theoretical part
	return { html: null, url: null, session_token: null, questions: [] };
}

module.exports = { sendToDevlabEnvelope, requestCodingQuestions, sendCodingGradeEnvelope, requestCodingWidgetHtml };
