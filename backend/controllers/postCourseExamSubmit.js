const { evaluatePostCourseExam } = require('../services/aiEvaluator');
const fs = require('fs');
const path = require('path');

exports.submitPostCourseExam = async (req, res) => {
	try {
		const { answers, questions } = req.body || {};
		if (!questions || !Array.isArray(questions)) {
			return res.status(400).json({ error: 'bad_request', message: 'Missing questions array' });
		}
        const userId = req.user?.sub || 'demo-user';
        const result = await evaluatePostCourseExam(answers || {}, questions, { userId });
		const outputPath = path.join(__dirname, '../../artifacts/ai-evaluation/post-course-feedback.json');
		try {
			const outDir = path.dirname(outputPath);
			if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
			fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
		} catch (e) {
			// best-effort artifact write
		}
		res.json(result);
	} catch (err) {
		res.status(500).json({ error: 'server_error', message: err.message });
	}
};


