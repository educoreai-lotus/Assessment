const { normalizeToInt } = require('../services/core/idNormalizer');
const { getAttemptDetail } = require('../services/core/attemptsService');

exports.getResultByExamAndAttempt = async (req, res, next) => {
  try {
    const { examId, attemptId } = req.params;
    const examIdNum = normalizeToInt(examId);
    const attemptIdNum = normalizeToInt(attemptId);
    if (examIdNum == null || attemptIdNum == null) {
      return res.status(400).json({ error: 'invalid_identifiers' });
    }
    const detail = await getAttemptDetail(attemptIdNum);
    if (!detail) return res.status(404).json({ error: 'not_found' });
    if (Number(detail.exam_id) !== Number(examIdNum)) {
      return res.status(400).json({ error: 'exam_mismatch' });
    }
    return res.json(detail);
  } catch (err) {
    return next(err);
  }
};


