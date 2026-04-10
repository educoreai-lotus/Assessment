/**
 * POST /api/ai-query/run is operational/admin tooling, not a learner API.
 * In production-like runs, only system administrators may invoke it.
 *
 * NODE_ENV=test: skipped so the route stack matches existing integration tests
 * (authenticate is also a no-op in test).
 */
function requireAiQueryOperator(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  if (req.user && req.user.isSystemAdmin === true) {
    return next();
  }
  return res.status(403).json({
    error: 'forbidden',
    message: 'ai_query_requires_system_admin',
  });
}

module.exports = { requireAiQueryOperator };
