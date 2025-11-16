const express = require('express');
const router = express.Router();

const integrationController = require('../controllers/integrationController');

// Inbound unified integration endpoint (multiple callers use this)
/**
 * @openapi
 * /api/assessment/integration:
 *   post:
 *     summary: Unified inbound integration (POST)
 *     description: Handles POST integrations from Skills Engine, Course Builder, DevLab, RAG, Protocol Camera
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               api_caller:
 *                 type: string
 *               stringified_json:
 *                 type: string
 *     responses:
 *       202:
 *         description: Accepted
 *   get:
 *     summary: Unified inbound integration (GET)
 *     description: Handles GET integrations for Learning Analytics and Management
 *     parameters:
 *       - in: query
 *         name: api_caller
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: stringified_json
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.post('/api/assessment/integration', integrationController.handlePostIntegration);
router.get('/api/assessment/integration', integrationController.handleGetIntegration);

// Phase 08.4 – ManagementReporting 24h Pull Integration
router.get('/api/integrations/management/report', integrationController.getManagementDailyReport);

// Phase 08.5 – CourseBuilder Pre-Exam (incoming request)
router.post(
	'/api/integrations/coursebuilder/pre-exam',
	integrationController.handleCourseBuilderPreExam
);

module.exports = router;


