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
			const html = typeof json.data.componentHtml === 'string'
        ? json.data.componentHtml
        : (typeof json.data.componentHTML === 'string'
          ? json.data.componentHTML
          : (typeof json.data.component_html === 'string'
            ? json.data.component_html
            : (typeof json.data.html === 'string' ? json.data.html : null)));
			const questions = Array.isArray(json.data.questions) ? json.data.questions : [];
			return { html, questions, raw: null };
		}
		// Legacy: try response.answers (HTML) and response.answer (double-encoded JSON string)
		let html = typeof json?.response?.answers === 'string' ? json.response.answers : null;
		let questions = Array.isArray(json?.response?.questions) ? json.response.questions : [];
    let raw = null;
		// Parse response.answer if it is a JSON string or object
		if (json?.response?.answer) {
			try {
        raw = typeof json.response.answer === 'string' ? json.response.answer : JSON.stringify(json.response.answer);
				let parsed = typeof json.response.answer === 'string' ? JSON.parse(json.response.answer) : json.response.answer;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch {}
        }
				if (parsed && typeof parsed === 'object') {
					if (!html && typeof parsed.componentHtml === 'string') html = parsed.componentHtml;
          if (!html && typeof parsed.componentHTML === 'string') html = parsed.componentHTML;
          if (!html && typeof parsed.component_html === 'string') html = parsed.component_html;
          if (!html && typeof parsed.html === 'string') html = parsed.html;
					if (Array.isArray(parsed.questions)) questions = parsed.questions;
					else if (!questions.length && Array.isArray(parsed.results)) questions = parsed.results;
				} else if (Array.isArray(parsed)) {
					questions = parsed;
				}
			} catch { /* ignore parse errors */ }
		}
		if (html || (questions && questions.length > 0)) return { html, questions, raw };
	} catch (err) {
		try { console.log('[MOCK-FALLBACK][DevLab][coding-widget][error]', { message: err?.message }); } catch {}
	}
	// Fallback: return nothing; UI will render only theoretical part
	return { html: null, questions: [], raw: null };
}

module.exports = { sendToDevlabEnvelope, requestCodingQuestions, sendCodingGradeEnvelope, requestCodingWidgetHtml };
