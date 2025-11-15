const express = require('express');
const router = express.Router();
const attemptsController = require('../controllers/attemptsController');

/**
 * @openapi
 * /api/attempts/user/{userId}:
 *   get:
 *     summary: List attempts for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           example: u_123
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/user/:userId', attemptsController.getUserAttempts);

/**
 * @openapi
 * /api/attempts/{attemptId}:
 *   get:
 *     summary: Get attempt detail
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:attemptId', attemptsController.getAttemptById);

/**
 * @openapi
 * /api/attempts/{attemptId}/skills:
 *   get:
 *     summary: Get attempt per-skill results
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:attemptId/skills', attemptsController.getAttemptSkills);

/**
 * @openapi
 * /api/attempts/{attemptId}/remaining_time:
 *   get:
 *     summary: Get remaining time for an attempt
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:attemptId/remaining_time', attemptsController.getRemainingTime);

module.exports = router;


