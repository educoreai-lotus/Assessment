const router = require('express').Router();
const postCourseOverride = require('../controllers/postCourseOverride');
const { requireScope } = require('../utils/auth');

router.post('/override/post-course', requireScope('manage:assessments'), postCourseOverride);

module.exports = router;


