const { canAttempt } = require('../services/attemptTracker');
const directory = require('../services/directoryPolicy');
const fs = require('fs');
const path = require('path');

module.exports = async function postCourseBuild(req, res) {
	const userId = req.user?.id || 'demo-user-1';
	const policy = await directory.getPostCoursePolicy({ userId });
	const check = canAttempt({ userId, examType: 'post-course', maxAttempts: policy.max_attempts });

	if (!check.ok) {
		if (check.reason === 'limit') {
			return res.status(403).json({
				error: 'ATTEMPT_LIMIT_REACHED',
				message: `Max attempts (${policy.max_attempts}) reached. Please request an incident override.`,
				data: { max_attempts: policy.max_attempts },
			});
		}
		if (check.reason === 'cooldown') {
			return res.status(429).json({
				error: 'COOLDOWN_ACTIVE',
				message: `Next attempt available after ${check.until}.`,
				data: { until: check.until },
			});
		}
	}

	const out = {
		examType: 'post-course',
		userId,
		builtAt: new Date().toISOString(),
		questions: [],
		policy,
	};

	const ART_PATH = path.join(process.cwd(), 'artifacts', 'ai-generation');
	if (!fs.existsSync(ART_PATH)) fs.mkdirSync(ART_PATH, { recursive: true });
	fs.writeFileSync(path.join(ART_PATH, 'post-course-exam-build.json'), JSON.stringify(out, null, 2));

	return res.json(out);
};


