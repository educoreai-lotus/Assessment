const express = require('express');
const router = express.Router();
const { buildBaselineExam } = require('../controllers/examBuilder');
const { requireScope } = require('../utils/auth');

router.post('/baseline/build', requireScope('submit:assessments'), async (req, res) => {
	try {
		const userId = req.user?.sub || 'demo-user';
		const result = await buildBaselineExam(userId);
		res.status(200).json(result);
	} catch (err) {
		console.error('Baseline build error:', err);
		res.status(500).json({ error: 'server_error', message: err.message });
	}
});

module.exports = router;


