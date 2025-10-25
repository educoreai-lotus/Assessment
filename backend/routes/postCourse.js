const router = require('express').Router();
const postCourseBuild = require('../controllers/postCourseBuild');
const postCourseSubmit = require('../controllers/postCourseSubmit');
const { requireScope } = require('../utils/auth');

router.get('/build', requireScope('manage:assessments'), postCourseBuild);
router.post('/submit', requireScope('submit:assessments'), postCourseSubmit);

module.exports = router;


