// Simple mock AI evaluator that scores answers by comparing to expected_answer
// and aggregates per-skill scores with pass/fail based on passingGrade.

function normalize(text) {
	if (typeof text !== 'string') return '';
	return text.trim().toLowerCase();
}

function scoreAnswer(expected, actual) {
	// Return 0..100 with no floor
	const exp = normalize(expected);
	const act = normalize(actual);
	if (!act) return 0;
	if (act === exp) return 100;
	// keyword overlap heuristic
	const expTokens = exp.split(/\W+/).filter(Boolean);
	const actTokens = act.split(/\W+/).filter(Boolean);
	const expSet = new Set(expTokens);
	let overlap = 0;
	for (const t of actTokens) if (expSet.has(t)) overlap++;
	const ratio = expTokens.length ? overlap / expTokens.length : 0;
	if (ratio >= 0.5) return 80;
	if (ratio > 0) return 40;
	return 10; // something present but no overlap
}

function aggregateBySkill(questions, answers) {
	const skillStats = new Map();
	for (const q of questions) {
		const key = q.skill || 'general';
		const actual = answers[q.id];
		const expected = q.expected_answer || '';
		const score = Math.max(0, Math.min(100, scoreAnswer(expected, actual)));
		if (!skillStats.has(key)) skillStats.set(key, { total: 0, count: 0 });
		skillStats.get(key).total += score;
		skillStats.get(key).count += 1;
	}
	const feedback = [];
	for (const [skill, stat] of skillStats.entries()) {
		const avg = stat.count ? Math.round(stat.total / stat.count) : 0;
		feedback.push({ skill, score: avg });
	}
	return feedback;
}

async function evaluateSubmission({ questions, answers, passingPolicy }) {
	const perSkill = aggregateBySkill(questions, answers);
	const defaultPassing = passingPolicy?.defaultPassing ?? 70;
	const skillsPassing = passingPolicy?.skills || {};
	let allSkillsPass = true;
	for (const s of perSkill) {
		const key = String(s.skill || 'general').toLowerCase();
		const threshold = typeof skillsPassing[key] === 'number' ? skillsPassing[key] : defaultPassing;
		s.passed = s.score >= threshold;
		if (!s.passed) allSkillsPass = false;
	}
	const finalGrade = perSkill.length ? Math.round(perSkill.reduce((a, b) => a + b.score, 0) / perSkill.length) : 0;
	const summary = allSkillsPass ? 'Passed' : 'Failed';
	const skill_status = Object.fromEntries(perSkill.map(s => [String(s.skill).toLowerCase(), s.passed ? 'done' : 'needs_improvement']));
	return { ai_feedback: perSkill, final_grade: finalGrade, summary, passing_thresholds: { default: defaultPassing, skills: skillsPassing }, skill_status };
}

module.exports = { evaluateSubmission };


