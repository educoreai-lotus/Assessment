const express = require('express');
const router = express.Router();
const { buildPostCourseExam, submitPostCourseExam } = require('../controllers/examPostCourseController');

router.post('/build', buildPostCourseExam);
router.post('/submit', submitPostCourseExam);

module.exports = router;


