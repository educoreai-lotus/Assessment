const express = require('express');
const router = express.Router();
const { requireScope } = require('../utils/auth');
const { buildPostCourseExam } = require('../controllers/postCourseExamBuilder');
const { submitPostCourseExam } = require('../controllers/postCourseExamSubmit');

// Build exam from Course Builder data (POST)
router.post('/post-course/build', requireScope('manage:assessments'), buildPostCourseExam);

// Submit exam results
router.post('/post-course/submit', requireScope('submit:assessments'), submitPostCourseExam);

module.exports = router;


