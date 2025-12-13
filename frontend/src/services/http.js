import axios from 'axios';

function resolveBaseUrl() {
  // Force production backend to avoid misconfigured envs in multi-origin deployments
  return 'https://assessment-tests-production.up.railway.app';
}

export const http = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Minimal diagnostics to surface failing URL in production
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


