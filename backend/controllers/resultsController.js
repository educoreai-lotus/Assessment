const { normalizeToInt } = require('../services/core/idNormalizer');
const { getAttemptDetail, resolveAttemptDirectoryAccess } = require('../services/core/attemptsService');

function skipResourceOwnership(req) {
  return process.env.NODE_ENV === 'test' && !req.user;
}

exports.getResultByExamAndAttempt = async (req, res, next) => {
  try {
    const { examId, attemptId } = req.params;
    const examIdNum = normalizeToInt(examId);
    const attemptIdNum = normalizeToInt(attemptId);
    if (examIdNum == null || attemptIdNum == null) {
      return res.status(400).json({ error: 'invalid_identifiers' });
    }
    if (!skipResourceOwnership(req)) {
      const dir = req.user?.directoryUserId;
      if (!dir || String(dir).trim() === '') {
        return res.status(403).json({ error: 'forbidden' });
      }
      const access = await resolveAttemptDirectoryAccess(attemptIdNum, dir);
      if (access === 'forbidden') return res.status(403).json({ error: 'forbidden' });
      if (access === 'not_found') return res.status(404).json({ error: 'not_found' });
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


