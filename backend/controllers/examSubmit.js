const path = require('path');
const fs = require('fs');
const { evaluateSubmission } = require('../services/aiEvaluator');
const { requireScope } = require('../utils/auth');
const directory = require('../services/integrations/directory');

// In-memory cache of last built exam to associate questions to user. In real
// systems, this would persist to a DB. For demo, accept questions from client.

async function submitBaseline(req, res) {
  try {
    const userId = req.user?.sub || 'demo-user';
    const { user_id, answers, questions, passing_grade } = req.body || {};
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'bad_request', message: 'answers is required' });
    }

    // Prefer questions from request; fallback to artifacts/mock if provided later
    const qs = Array.isArray(questions) ? questions : [];
    if (!qs.length) {
      return res.status(400).json({ error: 'bad_request', message: 'questions array is required for evaluation in demo mode' });
    }

    const passingGrade = typeof passing_grade === 'number' ? passing_grade : 70;
    const result = await evaluateSubmission({ questions: qs, answers, passingGrade });

    const payload = {
      ...result,
      type: 'baseline',
      requires_retake: false,
      timestamp: new Date().toISOString(),
    };

    // Persist feedback sample to artifacts (append-only overwrite latest sample path)
    const artifactDir = path.join(__dirname, '../../artifacts/ai-evaluation');
    if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
    const filePath = path.join(artifactDir, 'baseline-feedback.json');
    fs.writeFileSync(filePath, JSON.stringify({ user_id: userId || user_id, ...payload }, null, 2));

    // Do not increment or report attempts for baseline
    delete payload.attempt;
    delete payload.max_attempts;
    delete payload.attempt_info;
    if (payload.policy) {
      delete payload.policy.max_attempts;
      delete payload.policy.retry_cooldown_hours;
      delete payload.policy.attempts_used;
    }

    return res.status(200).json(payload);
  } catch (err) {
    console.error('Baseline submit error:', err);
    return res.status(500).json({ error: 'server_error', message: 'Unexpected error during evaluation' });
  }
}

module.exports = { submitBaseline };


