import axios from 'axios';

function resolveBaseUrl() {
  // Prefer Vite env
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
      return String(import.meta.env.VITE_API_BASE_URL).replace(/\/+$/, '');
    }
  } catch (_) {
    // ignore
  }
  // Hard fallback to production URL if .env is unavailable in this environment
  return 'https://assessment-tests-production.up.railway.app';
}

export const http = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export function errorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Request failed';
}


