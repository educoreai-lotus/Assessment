const express = require('express');
const router = express.Router();
const controller = require('../controllers/examPostCourseController');

// Support both canonical names and aliases expected by infra
const buildHandler = controller.buildExam || controller.buildPostCourseExam;
const submitHandler = controller.submitExam || controller.submitPostCourseExam;

router.post('/build', buildHandler);
router.post('/submit', submitHandler);

module.exports = router;


