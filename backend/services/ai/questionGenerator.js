const OpenAI = require('openai');

const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

function getOpenAI() {
	if (!OPENAI_API_KEY) return null;
	try { return new OpenAI({ apiKey: OPENAI_API_KEY }); } catch (_) { return null; }
}

function coerceString(v, d='') {
	if (v == null) return d;
	try { return String(v); } catch (_) { return d; }
}

function fallbackQuestion({ skill, difficulty='medium', examType='baseline', variant='theoretical' }) {
	const idBase = coerceString(skill).replace(/\s+/g, '_').toLowerCase();
	const title = examType === 'postcourse'
		? `Applied ${coerceString(skill)}`
		: `${coerceString(skill)} Fundamentals`;
	let prompt;
	switch (variant) {
		case 'scenario':
			prompt = `Given a real-world scenario, apply ${skill} best practices. Explain tradeoffs and provide a short example.`; break;
		case 'coding':
			prompt = `Write a short code snippet demonstrating a key concept of ${skill}.` ; break;
		default:
			prompt = `Explain core principles of ${skill} with a concise example.`;
	}
	return {
		id: `${idBase}_${variant}`,
		type: variant === 'coding' ? 'coding' : 'written',
		title,
		prompt,
		difficulty,
		skill: idBase,
	};
}

async function generateQuestionsForSkill({ skill, difficulty='medium', examType='baseline' }) {
	const client = getOpenAI();
	const skillName = coerceString(skill?.name || skill);
	if (!client) {
		// Heuristic set: theoretical + scenario
		return [
			fallbackQuestion({ skill: skillName, difficulty, examType, variant: 'theoretical' }),
			fallbackQuestion({ skill: skillName, difficulty, examType, variant: 'scenario' }),
		];
	}
	const system = 'You are an assessment generator. Output strict JSON.';
	const user = `Generate 2 exam questions for the skill "${skillName}".
	Style:
	- examType: ${examType}
	- difficulty: ${difficulty}
	- types: written (theoretical) and scenario.
	Return JSON:
	{
	  "items": [
	    {"id": string, "type": "written", "title": string, "prompt": string, "difficulty": string, "skill": string},
	    {"id": string, "type": "written", "title": string, "prompt": string, "difficulty": string, "skill": string}
	  ]
	}`;
	try {
		const resp = await client.chat.completions.create({
			model: AI_MODEL,
			response_format: { type: 'json_object' },
			messages: [ { role: 'system', content: system }, { role: 'user', content: user } ],
		});
		const content = coerceString(resp?.choices?.[0]?.message?.content);
		const json = JSON.parse(content || '{}');
		const items = Array.isArray(json.items) ? json.items : [];
		return items.map((q, idx) => ({
			id: coerceString(q.id || `${skillName.toLowerCase().replace(/\s+/g,'_')}_${idx+1}`),
			type: 'written',
			title: coerceString(q.title || `${skillName} Question`),
			prompt: coerceString(q.prompt || `Explain ${skillName}.`),
			difficulty: coerceString(q.difficulty || difficulty),
			skill: coerceString(q.skill || skillName).toLowerCase().replace(/\s+/g,'_'),
		}));
	} catch (_) {
		return [
			fallbackQuestion({ skill: skillName, difficulty, examType, variant: 'theoretical' }),
			fallbackQuestion({ skill: skillName, difficulty, examType, variant: 'scenario' }),
		];
	}
}

async function generateQuestions({ targetSkills = [], courseId, examType='baseline' }) {
	const out = [];
	for (const s of targetSkills) {
		// eslint-disable-next-line no-await-in-loop
		const qs = await generateQuestionsForSkill({ skill: s.name || s, difficulty: s.difficulty || 'medium', examType });
		out.push(...qs);
	}
	return out;
}

module.exports = { generateQuestions, generateQuestionsForSkill };
