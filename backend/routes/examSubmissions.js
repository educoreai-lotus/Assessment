const express = require('express');
const router = express.Router();
const { submitBaseline } = require('../controllers/examSubmit');
const { requireScope } = require('../utils/auth');

// POST /api/v1/exams/baseline/submit
router.post('/baseline/submit', requireScope('submit:assessments'), submitBaseline);

module.exports = router;


