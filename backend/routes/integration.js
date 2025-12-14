const express = require('express');
const router = express.Router();

const integrationController = require('../controllers/integrationController');

// Lightweight inbound request logger for integration routes
router.use((req, res, next) => {
	try {
		// eslint-disable-next-line no-console
		console.log('[INBOUND][API]', {
			method: req.method,
			path: req.originalUrl || req.url,
			ip: req.ip || null,
		});
	} catch {}
	next();
});

/**
 * @openapi
 * /api/fill-content-metrics:
 *   post:
 *     summary: Universal inbound integration endpoint
 *     description: Accepts all inbound integration requests via a unified envelope.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requester_service, stringified_json]
 *             properties:
 *               requester_service:
 *                 type: string
 *                 description: The requesting service name (e.g., coursebuilder, management, directory, skillsengine, devlab, learninganalytics)
 *               stringified_json:
 *                 type: string
 *                 description: Stringified JSON payload for the request
 *     responses:
 *       200:
 *         description: Accepted envelope processed
 *       400:
 *         description: Invalid envelope
 */
router.post('/fill-content-metrics', integrationController.universalIntegrationHandler);

module.exports = router;


