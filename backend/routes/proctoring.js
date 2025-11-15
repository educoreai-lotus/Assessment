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

module.exports = router;


