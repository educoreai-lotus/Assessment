const express = require('express');
const router = express.Router();
const examsController = require('../controllers/examsController');

/**
 * @openapi
 * /api/exams:
 *   post:
 *     summary: Create exam (baseline or postcourse)
 *     description: Creates an exam and initial attempt, builds ExamPackage via integrations with safe mock fallbacks.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, exam_type]
 *             properties:
 *               user_id:
 *                 type: string
 *                 example: u_123
 *               exam_type:
 *                 type: string
 *                 enum: [baseline, postcourse]
 *               course_id:
 *                 type: string
 *                 example: c_789
 *               course_name:
 *                 type: string
 *                 example: Intro to JS
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', examsController.createExam);

/**
 * @openapi
 * /api/exams/{examId}/start:
 *   post:
 *     summary: Start an exam attempt
 *     description: Marks attempt as started and returns ExamPackage (policy, skills, coverage_map, questions).
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attempt_id]
 *             properties:
 *               attempt_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Started
 */
router.post('/:examId/start', examsController.startExam);

/**
 * @openapi
 * /api/exams/{examId}/cancel:
 *   post:
 *     summary: Cancel an active exam attempt
 *     description: Marks the current active attempt for the given exam as cancelled and ends it.
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attempt_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cancelled
 */
router.post('/:examId/cancel', examsController.cancelExam);

// Package readiness / exam info
router.get('/:examId', examsController.getExam);

// Async preparation status
router.get('/:examId/status', examsController.getExamStatus);

/**
 * @openapi
 * /api/exams/{examId}/proctoring:
 *   post:
 *     summary: Start proctoring session for an attempt
 *     description: Activates the proctoring camera session for the given exam/attempt.
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attempt_id]
 *             properties:
 *               attempt_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Proctoring session started
 */
router.post('/:examId/proctoring/start', examsController.startProctoring);

/**
 * @openapi
 * /api/exams/{examId}/resolve:
 *   get:
 *     summary: Resolve timing/status for latest attempt of exam
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Resolved timing/status
 */
router.get('/:examId/resolve', examsController.resolveExam);

/**
 * @openapi
 * /api/exams/{examId}/submit:
 *   post:
 *     summary: Submit an exam attempt
 *     description: Grades the attempt, upserts per-skill results, and pushes outbox integration payloads.
 *     parameters:
 *       - in: path
 *         name: examId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attempt_id, answers]
 *             properties:
 *               attempt_id:
 *                 type: integer
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [question_id, type, skill_id, answer]
 *                   properties:
 *                     question_id:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [mcq, open, code]
 *                     skill_id:
 *                       type: string
 *                     answer:
 *                       type: string
 *                     metadata:
 *                       type: object
 *     responses:
 *       200:
 *         description: Submission accepted
 */
router.post('/:examId/submit', examsController.submitExam);

// DevLab coding grading ingestion (exam-type agnostic)
router.post('/submit-coding-grade', examsController.submitCodingGrade);

// Post-course coverage flow entrypoint (frontend -> backend)
router.post('/postcourse/coverage', examsController.requestPostcourseCoverage);

// Exam context snapshot from Directory redirect (baseline)
router.post('/context', examsController.saveExamContext);

module.exports = router;


