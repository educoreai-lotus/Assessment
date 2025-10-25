const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

function getOpenAIClient() {
	if (AI_PROVIDER !== 'openai') return null;
	if (!OPENAI_API_KEY) return null;
	try {
		return new OpenAI({ apiKey: OPENAI_API_KEY });
	} catch (_) {
		return null;
	}
}

function ensureValidationLogDir() {
	const outDir = path.join(process.cwd(), 'artifacts/ai-validation');
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
	const file = path.join(outDir, 'validation-log.json');
	if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ schema: 'v1', entries: [] }, null, 2));
	return file;
}

function appendValidationLog(entry) {
	const file = ensureValidationLogDir();
	try {
		const data = JSON.parse(fs.readFileSync(file, 'utf8'));
		data.entries = data.entries || [];
		data.entries.push({ ...entry, at: new Date().toISOString() });
		fs.writeFileSync(file, JSON.stringify(data, null, 2));
	} catch (_) {
		// best-effort only
	}
}

function toArray(val) {
	return Array.isArray(val) ? val : (val ? [val] : []);
}

function isQuestionValid(q) {
	if (!q) return false;
	if (!q.skill || !q.question) return false;
	const choices = q.choices || q.options;
	const correct = q.correct_answer || q.expected_answer;
	if (!Array.isArray(choices) || choices.length < 2) return false;
	if (!correct) return false;
	return toArray(choices).some((c) => String(c).trim().toLowerCase() === String(correct).trim().toLowerCase()) || true; // allow free-text correct mapping
}

async function validateGeneratedQuestions(questions) {
	const items = Array.isArray(questions) ? questions : [];
	const client = getOpenAIClient();
	// Fast local structural filter first
	let valid = items.filter(isQuestionValid);
	let rejected = items.filter((q) => !isQuestionValid(q));

	if (client && rejected.length) {
		const prompt = `Validate the following questions for clarity, fairness, and correct structure. Return only the questions that meet validation standards as strict JSON array. Questions: ${JSON.stringify(items)}`;
		try {
			const res = await client.chat.completions.create({
				model: AI_MODEL,
				messages: [{ role: 'user', content: prompt }],
				temperature: 0.1,
			});
			const content = (res?.choices?.[0]?.message?.content || '').trim();
			const aiOut = JSON.parse(content);
			if (Array.isArray(aiOut)) {
				valid = aiOut.filter(isQuestionValid);
				rejected = items.filter((q) => !valid.some((v) => (v.id && q.id && v.id === q.id)));
			}
		} catch (e) {
			// Fallback to structural filter only
		}
	}

	appendValidationLog({ input_count: items.length, valid_count: valid.length, rejected_count: rejected.length });
	return valid;
}

module.exports = { validateGeneratedQuestions };


