const {
  getAttemptsForUser,
  getAttemptDetail,
  getAttemptSkills,
  routeUserIdMatchesDirectoryUser,
  resolveAttemptDirectoryAccess,
} = require('../services/core/attemptsService');
const pool = require('../config/supabaseDB');

function skipResourceOwnership(req) {
  return process.env.NODE_ENV === 'test' && !req.user;
}

exports.getUserAttempts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let effectiveUserId = userId;
    if (!skipResourceOwnership(req)) {
      const dir = req.user?.directoryUserId;
      if (!dir || String(dir).trim() === '') {
        return res.status(403).json({ error: 'forbidden' });
      }
      if (!routeUserIdMatchesDirectoryUser(userId, dir)) {
        return res.status(403).json({ error: 'forbidden' });
      }
      effectiveUserId = dir;
    }
    const attempts = await getAttemptsForUser(effectiveUserId);
    return res.json(attempts);
  } catch (err) {
    return next(err);
  }
};

exports.getAttemptById = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    if (!skipResourceOwnership(req)) {
      const dir = req.user?.directoryUserId;
      if (!dir || String(dir).trim() === '') {
        return res.status(403).json({ error: 'forbidden' });
      }
      const access = await resolveAttemptDirectoryAccess(attemptId, dir);
      if (access === 'forbidden') return res.status(403).json({ error: 'forbidden' });
      if (access === 'not_found') return res.status(404).json({ error: 'not_found' });
    }
    const data = await getAttemptDetail(attemptId);
    if (!data) return res.status(404).json({ error: 'not_found' });
    const status = data?.status || null;
    if (String(status) === 'pending_coding') {
      return res.json({ status: 'PENDING_CODING' });
    }
    if (String(status) === 'canceled') {
      return res.json({ status: 'CANCELED', reason: data?.cancel_reason || 'canceled' });
    }
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};

exports.getAttemptSkills = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    if (!skipResourceOwnership(req)) {
      const dir = req.user?.directoryUserId;
      if (!dir || String(dir).trim() === '') {
        return res.status(403).json({ error: 'forbidden' });
      }
      const access = await resolveAttemptDirectoryAccess(attemptId, dir);
      if (access === 'forbidden') return res.status(403).json({ error: 'forbidden' });
      if (access === 'not_found') return res.status(404).json({ error: 'not_found' });
    }
    const data = await getAttemptSkills(attemptId);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};

exports.getRemainingTime = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    if (!skipResourceOwnership(req)) {
      const dir = req.user?.directoryUserId;
      if (!dir || String(dir).trim() === '') {
        return res.status(403).json({ error: 'forbidden' });
      }
      const access = await resolveAttemptDirectoryAccess(attemptId, dir);
      if (access === 'forbidden') return res.status(403).json({ error: 'forbidden' });
      if (access === 'not_found') return res.status(404).json({ error: 'not_found' });
    }
    const { rows } = await pool.query(
      `SELECT expires_at FROM exam_attempts WHERE attempt_id = $1`,
      [attemptId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' });
    const exp = rows[0].expires_at ? new Date(rows[0].expires_at) : null;
    if (!exp) {
      return res.json({ remaining_seconds: null, expired: false });
    }
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const expired = remainingSeconds === 0 && now > exp;
    return res.json({ remaining_seconds: remainingSeconds, expired });
  } catch (err) {
    return next(err);
  }
};


