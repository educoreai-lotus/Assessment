const {
  postAuthValidationToCoordinator,
  buildReqUserFromValidation,
} = require('../services/auth/coordinatorRequestAuth');

function extractBearerToken(req) {
  const raw = req.headers.authorization || req.headers.Authorization;
  if (raw == null || typeof raw !== 'string') {
    return { error: 'missing' };
  }
  const trimmed = raw.trim();
  const match = /^Bearer\s+(\S.*)$/i.exec(trimmed);
  if (!match) {
    return { error: 'malformed' };
  }
  const token = String(match[1] || '').trim();
  if (!token) {
    return { error: 'empty' };
  }
  return { token };
}

/**
 * Platform auth: Bearer → Coordinator POST /request → nAuth validation → req.user
 * Skipped when NODE_ENV === 'test' (existing test suite).
 */
async function authenticate(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const extracted = extractBearerToken(req);
  if (extracted.error) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const route = req.originalUrl;
  const method = req.method;

  try {
    const result = await postAuthValidationToCoordinator({
      accessToken: extracted.token,
      route,
      method,
    });

    const validation = result.validation;
    if (!result.ok || !validation || validation.valid !== true) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    req.user = buildReqUserFromValidation(validation);

    if (result.newAccessToken) {
      res.setHeader('X-New-Access-Token', result.newAccessToken);
    }

    return next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

module.exports = {
  authenticate,
  extractBearerToken,
};
