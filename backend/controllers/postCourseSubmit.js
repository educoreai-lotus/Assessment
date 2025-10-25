const fs = require('fs');
const path = require('path');
const directory = require('../services/directoryPolicy');
const { canAttempt, recordAttempt, setCooldown, getLatestVersion } = require('../services/attemptTracker');
const { evaluatePostCourseExam } = require('../services/aiEvaluator');

module.exports = async function postCourseSubmit(req, res) {
	const userId = req.user?.id || 'demo-user-1';
	const { answers, questions } = req.body || { answers: {}, questions: [] };

	const policy = await directory.getPostCoursePolicy({ userId });
	const check = canAttempt({ userId, examType: 'post-course', maxAttempts: policy.max_attempts });

	if (!check.ok) {
		if (check.reason === 'limit') {
			return res.status(403).json({ error: 'ATTEMPT_LIMIT_REACHED', message: `Max attempts (${policy.max_attempts}) reached.` });
		}
		if (check.reason === 'cooldown') {
			return res.status(429).json({ error: 'COOLDOWN_ACTIVE', message: `Next attempt available after ${check.until}.`, data: { until: check.until } });
		}
	}

    const ai = await evaluatePostCourseExam(answers || {}, questions || []);
	const final = {
		grade: ai.final_grade,
		passed: ai.summary === 'Passed',
		passing_grade: policy.passing_grade,
	};

	const result = {
		id: `post-course-${Date.now()}`,
		userId,
		examType: 'post-course',
		at: new Date().toISOString(),
		final,
		detail: { ai_feedback: ai.ai_feedback },
	};

	const AI_EVAL_DIR = path.join(process.cwd(), 'artifacts', 'ai-evaluation');
	if (!fs.existsSync(AI_EVAL_DIR)) fs.mkdirSync(AI_EVAL_DIR, { recursive: true });
	const feedbackPath = path.join(AI_EVAL_DIR, 'post-course-feedback.json');

	const nextVersion = getLatestVersion(userId, 'post-course') + 1;
	result.version = nextVersion;

	fs.writeFileSync(feedbackPath, JSON.stringify(result, null, 2));

	const { version } = recordAttempt({ userId, examType: 'post-course', result });

	if (!final.passed && policy.retry_cooldown_hours) {
		const until = new Date(Date.now() + policy.retry_cooldown_hours * 3600 * 1000).toISOString();
		setCooldown({ userId, examType: 'post-course', until });
	}

	return res.json({ message: 'SUBMITTED', version, result });
};


