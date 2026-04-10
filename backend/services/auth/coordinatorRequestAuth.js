const { generateSignature } = require('../../utils/signature');

const COORDINATOR_URL = process.env.COORDINATOR_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

/** Fixed nAuth validation action (platform contract). */
const AUTH_VALIDATION_ACTION =
  'Route this request to nAuth service only for access token validation and session continuity decision.';

const AUTH_REQUESTER_NAME = 'Assessment';

function normalizeCoordinatorBase() {
  if (!COORDINATOR_URL) return null;
  return String(COORDINATOR_URL).replace(/\/+$/, '');
}

function buildAuthValidationUrl() {
  const base = normalizeCoordinatorBase();
  if (!base) return null;
  return `${base}/request`;
}

function buildAuthValidationEnvelope({ accessToken, route, method }) {
  return {
    requester_name: AUTH_REQUESTER_NAME,
    payload: {
      action: AUTH_VALIDATION_ACTION,
      access_token: accessToken,
      route,
      method: String(method || 'GET').toUpperCase(),
    },
    response: {
      valid: false,
      reason: '',
      auth_state: '',
      directory_user_id: '',
      organization_id: '',
      primary_role: '',
      is_system_admin: false,
      new_access_token: '',
    },
  };
}

/**
 * Extract nAuth validation result from Coordinator response body (flexible shapes).
 */
function extractValidationResponse(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.response && typeof data.response === 'object' && !Array.isArray(data.response)) {
    return data.response;
  }
  if (
    data.payload &&
    typeof data.payload === 'object' &&
    data.payload.response &&
    typeof data.payload.response === 'object'
  ) {
    return data.payload.response;
  }
  if (typeof data.valid === 'boolean') {
    return data;
  }
  return null;
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s !== '') return s;
  }
  return '';
}

/**
 * Auth validation HTTP timeout: explicit COORDINATOR_AUTH_TIMEOUT_MS wins;
 * else same default as backend/services/gateways/coordinatorClient.js (COORDINATOR_TIMEOUT_MS / 180000).
 */
function resolveAuthValidationTimeoutMs() {
  const authMs = Number(process.env.COORDINATOR_AUTH_TIMEOUT_MS);
  if (Number.isFinite(authMs) && authMs > 0) {
    return authMs;
  }
  const coordMs = Number(process.env.COORDINATOR_TIMEOUT_MS);
  if (Number.isFinite(coordMs) && coordMs > 0) {
    return coordMs;
  }
  return 180000;
}

function buildReqUserFromValidation(resp) {
  const directoryUserId = firstNonEmpty(
    resp.directory_user_id,
    resp.directoryUserId,
  );
  const organizationId = firstNonEmpty(resp.organization_id, resp.organizationId);
  const primaryRole = firstNonEmpty(resp.primary_role, resp.primaryRole);
  const isSystemAdmin = !!(resp.is_system_admin ?? resp.isSystemAdmin);
  const subFromResponse = firstNonEmpty(resp.sub);
  const sub = subFromResponse || directoryUserId;
  const userId = directoryUserId || subFromResponse;

  return {
    userId: userId || '',
    sub: sub || undefined,
    directoryUserId: directoryUserId || undefined,
    organizationId: organizationId || undefined,
    primaryRole: primaryRole || undefined,
    isSystemAdmin,
    raw: resp,
  };
}

/**
 * POST auth validation envelope to Coordinator /request.
 * @returns {{ ok: boolean, status?: number, validation?: object, newAccessToken?: string, error?: string }}
 */
async function postAuthValidationToCoordinator({ accessToken, route, method }) {
  const url = buildAuthValidationUrl();
  if (!url) {
    return { ok: false, error: 'COORDINATOR_URL not set' };
  }

  const envelope = buildAuthValidationEnvelope({ accessToken, route, method });
  const body = JSON.stringify(envelope);

  const timeoutMs = resolveAuthValidationTimeoutMs();

  const headers = {
    'Content-Type': 'application/json',
  };

  if (PRIVATE_KEY) {
    try {
      const signature = generateSignature(AUTH_REQUESTER_NAME, PRIVATE_KEY, envelope);
      headers['X-Service-Name'] = AUTH_REQUESTER_NAME;
      headers['X-Signature'] = signature;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[CoordinatorRequestAuth] Failed to generate signature:', err?.message || err);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    let data = {};
    try {
      data = await resp.json();
    } catch {
      data = {};
    }

    const validation = extractValidationResponse(data);
    const newAccessToken = validation
      ? firstNonEmpty(validation.new_access_token, validation.newAccessToken)
      : '';

    if (!resp.ok) {
      return { ok: false, status: resp.status, validation, error: `HTTP ${resp.status}` };
    }

    return { ok: true, status: resp.status, validation, newAccessToken };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  } finally {
    try {
      clearTimeout(timer);
    } catch {}
  }
}

module.exports = {
  AUTH_REQUESTER_NAME,
  AUTH_VALIDATION_ACTION,
  buildAuthValidationEnvelope,
  extractValidationResponse,
  buildReqUserFromValidation,
  postAuthValidationToCoordinator,
  normalizeCoordinatorBase,
};
