const { setOverride } = require('../services/attemptTracker');

module.exports = async function postCourseOverride(req, res) {
	const { userId, allow } = req.body || {};
	if (!userId) return res.status(400).json({ error: 'MISSING_USER' });
	setOverride({ userId, examType: 'post-course', value: !!allow });
	res.json({ message: 'OVERRIDE_UPDATED', userId, allow: !!allow });
};


