import { clearAccessToken } from './accessToken';

function trimTrailingSlashes(s) {
  return String(s || '').replace(/\/+$/, '');
}

function requireNAuthEnv(name) {
  let raw;
  try {
    raw = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[name] : undefined;
  } catch {
    raw = undefined;
  }
  const trimmed = raw != null ? String(raw).trim() : '';
  if (!trimmed) {
    const msg = `[logout] Missing or empty ${name}. Set it in the Vite environment (e.g. .env).`;
    // eslint-disable-next-line no-console
    console.error(msg);
    throw new Error(msg);
  }
  return trimTrailingSlashes(trimmed);
}

/**
 * Management-equivalent frontend logout: POST nAuth /auth/logout (credentials, no auth header),
 * always clear Assessment token, then full-page redirect to nAuth login.
 */
export async function logout() {
  const nauthBase = requireNAuthEnv('VITE_NAUTH_BASE_URL');
  const nauthFrontend = requireNAuthEnv('VITE_NAUTH_FRONTEND_URL');

  try {
    await fetch(`${nauthBase}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  } catch {
    // Match Management: continue even if the request fails
  }

  clearAccessToken();

  window.location.href = `${nauthFrontend}/login`;
}
