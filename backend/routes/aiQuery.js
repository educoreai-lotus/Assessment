const express = require('express');
const router = express.Router();

const { runAIQueryAndApply } = require('../services/aiQuery/aiQueryService');

// POST /api/ai-query/run
router.post('/run', async (req, res) => {
	try {
		const { operation, params } = req.body || {};
		if (!operation || !params || typeof params !== 'object') {
			return res.status(400).json({ error: 'invalid_request' });
		}
		const result = await runAIQueryAndApply(operation, params);
		return res.json(result);
	} catch (err) {
		console.error('[AI-QUERY] Error:', err?.message || err);
		return res.status(500).json({ error: 'server_error' });
	}
});

module.exports = router;


