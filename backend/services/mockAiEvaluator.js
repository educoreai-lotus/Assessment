// Simple mock AI evaluator that scores answers by comparing to expected_answer
// and aggregates per-skill scores with pass/fail based on passingGrade.

function normalize(text) {
	if (typeof text !== 'string') return '';
	return text.trim().toLowerCase();
}

function scoreAnswer(expected, actual) {
	// Exact match yields 100, partial keyword overlap yields 60, else 0.
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
	if (ratio > 0) return 60;
	return 20; // something present but no overlap
}

function aggregateBySkill(questions, answers, passingGrade) {
	const skillStats = new Map();
	for (const q of questions) {
		const key = q.skill || 'General';
		const actual = answers[q.id];
		const expected = q.expected_answer || '';
		const score = scoreAnswer(expected, actual);
		if (!skillStats.has(key)) skillStats.set(key, { total: 0, count: 0 });
		skillStats.get(key).total += score;
		skillStats.get(key).count += 1;
	}
	const aiFeedback = [];
	let weightedTotal = 0;
	let questionCount = 0;
	for (const [skill, stat] of skillStats.entries()) {
		const avg = stat.count ? Math.round(stat.total / stat.count) : 0;
		aiFeedback.push({ skill, score: avg, passed: avg >= passingGrade });
		weightedTotal += stat.total;
		questionCount += stat.count;
	}
	const finalGrade = questionCount ? Math.round(weightedTotal / questionCount) : 0;
	return { aiFeedback, finalGrade };
}

function composeSummary(aiFeedback) {
	if (!aiFeedback.length) return 'No answers submitted.';
	const passed = aiFeedback.filter(s => s.passed).map(s => s.skill);
	const failed = aiFeedback.filter(s => !s.passed).map(s => s.skill);
	let parts = [];
	if (passed.length) parts.push(`Strengths in: ${passed.join(', ')}`);
	if (failed.length) parts.push(`Needs improvement in: ${failed.join(', ')}`);
	return parts.join('. ') || 'Mixed performance across skills.';
}

function evaluateSubmission({ questions, answers, passingGrade }) {
	const { aiFeedback, finalGrade } = aggregateBySkill(questions, answers, passingGrade);
	const summary = composeSummary(aiFeedback);
	return { ai_feedback: aiFeedback, final_grade: finalGrade, summary };
}

function evaluatePostCourseExam(answers, questions) {
	const feedback = (questions || []).map((q) => {
		const score = Math.floor(Math.random() * 40) + 60; // 60–100 range
		return {
			question_id: q.id,
			skill: q.skill,
			topic: q.topic,
			score,
			passed: score >= 60,
		};
	});

	const avg = feedback.length
		? Math.round(feedback.reduce((sum, f) => sum + f.score, 0) / feedback.length)
		: 0;
	return {
		ai_feedback: feedback,
		final_grade: avg,
		summary: avg >= 60 ? 'Passed' : 'Failed',
		generated_at: new Date().toISOString(),
	};
}

module.exports = { evaluateSubmission, evaluatePostCourseExam };


