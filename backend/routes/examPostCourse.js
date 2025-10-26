const express = require('express');
const router = express.Router();
const controller = require('../controllers/examPostCourseController');

router.post('/build', controller.buildPostCourseExam);
router.post('/submit', controller.submitPostCourseExam);

module.exports = router;


