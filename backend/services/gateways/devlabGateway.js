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
		const call = sendToCoordinator({ targetService: 'devlab-service', payload });
		const timeoutMs = Number.isFinite(Number(process.env.DEVLAB_REQUEST_TIMEOUT_MS)) ? Number(process.env.DEVLAB_REQUEST_TIMEOUT_MS) : 60000;
		const timed = await Promise.race([
			call,
			new Promise((_, reject) => setTimeout(() => reject(new Error('devlab_timeout')), timeoutMs)),
		]).catch((e) => { throw e; });
		const json = (timed && timed.data) ? timed.data : {};
		// Support both wrapped and top-level formats
		const src = (json && json.success && json.data) ? json.data : json;
		const questions = Array.isArray(src?.questions) ? src.questions
			: (Array.isArray(json?.response?.questions) ? json.response.questions : []);
		const html = (typeof src?.componentHtml === 'string' && src.componentHtml)
			|| (typeof src?.componentHTML === 'string' && src.componentHTML)
			|| (typeof src?.component_html === 'string' && src.component_html)
			|| (typeof src?.html === 'string' && src.html)
			|| (typeof json?.response?.answers === 'string' && json.response.answers)
			|| null;
		return { html, questions, raw: null };
	} catch (err) {
		try { console.log('[MOCK-FALLBACK][DevLab][coding-widget][error]', { message: err?.message }); } catch {}
	}
	// Fallback: return nothing; caller enforces determinism
	return { html: null, questions: [], raw: null };
}

module.exports = { sendToDevlabEnvelope, requestCodingQuestions, sendCodingGradeEnvelope, requestCodingWidgetHtml };
