const express = require('express');
const router = express.Router();
const resultsController = require('../controllers/resultsController');

/**
 * @openapi
 * /api/results/{examId}/{attemptId}:
 *   get:
 *     summary: Get results for a specific exam attempt
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Result payload for the attempt
 */
router.get('/:examId/:attemptId', resultsController.getResultByExamAndAttempt);

module.exports = { resultsRouter: router };


