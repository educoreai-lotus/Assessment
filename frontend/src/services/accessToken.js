/**
 * Platform handoff: URL hash #access_token=... → localStorage → Bearer on API calls.
 * Storage key matches the hash parameter name used across platform redirects.
 */
export const ACCESS_TOKEN_STORAGE_KEY = 'access_token';

export function getAccessToken() {
  try {
    const t = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    const s = t != null ? String(t).trim() : '';
    return s;
  } catch {
    return '';
  }
}

export function setAccessToken(token) {
  const s = token != null ? String(token).trim() : '';
  if (!s) return;
  try {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, s);
  } catch {}
}

export function clearAccessToken() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {}
}

/**
 * Persist rotated token from Coordinator/nAuth (backend sets X-New-Access-Token).
 */
export function applyRotatedTokenFromResponse(res) {
  if (!res || !res.headers) return;
  const next =
    res.headers['x-new-access-token'] ??
    res.headers['X-New-Access-Token'];
  if (next != null && String(next).trim() !== '') {
    setAccessToken(String(next).trim());
  }
}

/** Headers for fetch() JSON POSTs that hit authenticated routes */
export function jsonHeadersWithAuth() {
  const h = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/**
 * On first load: read #access_token=... (and standard &query fragment pairs), store, strip hash from URL.
 */
export function ingestAccessTokenFromHash() {
  if (typeof window === 'undefined') return;
  const raw = window.location.hash || '';
  if (!raw || raw.length < 2) return;
  const qs = raw.startsWith('#') ? raw.slice(1) : raw;
  let token = '';
  try {
    const params = new URLSearchParams(qs);
    token = params.get('access_token') || '';
  } catch {
    return;
  }
  const trimmed = String(token).trim();
  if (!trimmed) return;
  setAccessToken(trimmed);
  try {
    const clean = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', clean);
  } catch {}
}
