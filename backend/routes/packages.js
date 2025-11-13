const express = require('express');
const router = express.Router();
const packagesController = require('../controllers/packagesController');

/**
 * @openapi
 * /api/packages/{examId}:
 *   get:
 *     summary: Get ExamPackage by examId
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.get('/:examId', packagesController.getPackage);

module.exports = router;


