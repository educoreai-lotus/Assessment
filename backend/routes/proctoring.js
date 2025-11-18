const express = require('express');
const router = express.Router();
const proctoringController = require('../controllers/proctoringController');

/**
 * @openapi
 * /api/proctoring/{attempt_id}/start_camera:
 *   post:
 *     summary: Activate camera and create proctoring session
 *     description: Creates or updates a proctoring session for the attempt and sets camera_status=active.
 *     parameters:
 *       - in: path
 *         name: attempt_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Camera activated
 */
router.post('/:attempt_id/start_camera', proctoringController.startCamera);

/**
 * @openapi
 * /api/proctoring/{attempt_id}/focus_violation:
 *   post:
 *     summary: Report a focus violation for an attempt
 *     description: Increments violation count and cancels the attempt on the 3rd violation.
 *     parameters:
 *       - in: path
 *         name: attempt_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Violation recorded
 */
router.post('/:attempt_id/focus_violation', proctoringController.reportFocusViolation);

/**
 * @openapi
 * /api/proctoring/{attempt_id}/incident:
 *   post:
 *     summary: Report a generic proctoring incident for an attempt
 *     description: Records an incident event tied to an attempt for auditing.
 *     parameters:
 *       - in: path
 *         name: attempt_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Incident recorded
 * */
router.post('/:attempt_id/incident', proctoringController.reportIncident);

module.exports = router;


