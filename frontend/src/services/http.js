import axios from 'axios';

// Candidate API hosts in priority order
function candidateHosts() {
  const list = [];
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
      list.push(String(import.meta.env.VITE_API_BASE_URL).replace(/\/+$/, ''));
    }
  } catch {}
  // Known stable deployments
  list.push('https://assessment-tests-production.up.railway.app');
  list.push('https://assessment-production-2cad.up.railway.app');
  // Deduplicate while preserving order
  return Array.from(new Set(list.filter(Boolean)));
}

let selectedBaseURL =
  typeof window !== 'undefined'
    ? (localStorage.getItem('api_base_url') || 'https://assessment-tests-production.up.railway.app')
    : 'https://assessment-tests-production.up.railway.app';

export const http = axios.create({
  baseURL: selectedBaseURL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

async function probe(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 3000);
  try {
    const resp = await fetch(`${url}/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return resp.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function selectBaseUrl() {
  const candidates = candidateHosts();
  for (const url of candidates) {
    const ok = await probe(url);
    if (ok) return url;
  }
  return selectedBaseURL;
}

// Kick off selection immediately and update axios baseURL once resolved
export const httpReady = (async () => {
  try {
    const chosen = await selectBaseUrl();
    selectedBaseURL = chosen;
    http.defaults.baseURL = chosen;
    try {
      localStorage.setItem('api_base_url', chosen);
    } catch {}
    // eslint-disable-next-line no-console
    console.log('[HTTP][BASE_URL]', chosen);
  } catch {}
})();

// Diagnostics to surface failing URL in production
http.interceptors.response.use(
  (res) => res,
  (error) => {
    try {
      // eslint-disable-next-line no-console
      console.error('[HTTP][ERROR]', {
        url: error?.config?.baseURL
          ? `${error.config.baseURL}${error?.config?.url || ''}`
          : error?.config?.url || '',
        method: error?.config?.method,
        message: error?.message,
        status: error?.response?.status,
      });
    } catch {}
    return Promise.reject(error);
  },
);

export function errorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Request failed';
}


