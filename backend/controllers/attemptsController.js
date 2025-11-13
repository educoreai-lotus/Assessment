const { getAttemptsForUser, getAttemptDetail, getAttemptSkills } = require('../services/core/attemptsService');

exports.getUserAttempts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const attempts = await getAttemptsForUser(userId);
    return res.json(attempts);
  } catch (err) {
    return next(err);
  }
};

exports.getAttemptById = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const data = await getAttemptDetail(attemptId);
    if (!data) return res.status(404).json({ error: 'not_found' });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};

exports.getAttemptSkills = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const data = await getAttemptSkills(attemptId);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};


