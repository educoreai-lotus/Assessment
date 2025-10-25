const fs = require('fs');
const path = require('path');
const { getCourseTopics } = require('../services/integrations/courseBuilder');
const { getPassingPolicy } = require('../services/integrations/directory');
const { canAttempt } = require('../services/attemptTracker');
const { generateQuestionsForTopics, generateQuestionsForSkill } = require('../services/aiEvaluator');
const { validateGeneratedQuestions } = require('../services/aiValidator');

exports.buildPostCourseExam = async (req, res) => {
	try {
		const userId = req.user?.sub || 'demo-user';
		const { course_id } = req.query;
		const passingPolicy = await getPassingPolicy();

		// Enforce attempt limits and cooldowns
		const attemptCheck = canAttempt({ userId, examType: 'post-course', maxAttempts: passingPolicy.max_attempts });
		if (!attemptCheck.ok) {
			if (attemptCheck.reason === 'limit') {
				return res.status(403).json({ error: 'ATTEMPT_LIMIT_REACHED', message: `Max attempts (${passingPolicy.max_attempts}) reached.`, data: { max_attempts: passingPolicy.max_attempts } });
			}
			if (attemptCheck.reason === 'cooldown') {
				return res.status(429).json({ error: 'COOLDOWN_ACTIVE', message: `Next attempt available after ${attemptCheck.until}.`, data: { until: attemptCheck.until } });
			}
		}
		const topics = await getCourseTopics(course_id);

    const batches = [];
    for (const topic of topics) {
        // eslint-disable-next-line no-await-in-loop
        let qs = await generateQuestionsForTopics(topic.name, topic.skills);
        qs = await validateGeneratedQuestions(qs);
        // Best-effort regeneration per missing skill if any were rejected
        if (!qs.length && Array.isArray(topic.skills)) {
            for (const s of topic.skills) {
                // eslint-disable-next-line no-await-in-loop
                let retryQs = await generateQuestionsForSkill({ id: String(s).toLowerCase().replace(/\s+/g, '-'), name: String(s) });
                // Attach topic and validate
                retryQs = retryQs.map((q) => ({ ...q, topic: topic.name }));
                // eslint-disable-next-line no-await-in-loop
                const validated = await validateGeneratedQuestions(retryQs);
                batches.push(...validated);
            }
        } else {
            batches.push(...qs);
        }
    }
    const questions = batches;

		const duration = Math.ceil(questions.length * 1.5);
		const exam = {
			type: 'post-course',
			user_id: userId,
			course_id: course_id || 'demo-course',
			duration_min: duration,
			passing_grade: passingPolicy.passing_grade,
			questions,
			created_at: new Date().toISOString(),
		};

		// Write artifact for traceability (append-only convention by timestamped content)
		try {
			const outDir = path.join(__dirname, '../../artifacts/ai-generation');
			if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
			fs.writeFileSync(
				path.join(outDir, 'post-course-exam-build.json'),
				JSON.stringify({ meta: { user_id: userId, course_id: course_id || 'demo-course', q_count: questions.length }, exam_summary: { type: 'post-course', duration_min: duration } }, null, 2)
			);
		} catch (e) {
			// best-effort artifact write; do not block response
		}

		res.json(exam);
	} catch (err) {
		res.status(500).json({ error: 'server_error', message: err.message });
	}
};


