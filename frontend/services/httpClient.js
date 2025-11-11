import axios from 'axios';

function resolveBaseUrl() {
	// Prefer Next.js-style env first
	if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_BASE) {
		return process.env.NEXT_PUBLIC_API_BASE.replace(/\/+$/, '');
	}
	// Try Vite-style env
	try {
		// eslint-disable-next-line no-undef
		if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) {
			// eslint-disable-next-line no-undef
			return import.meta.env.VITE_API_BASE.replace(/\/+$/, '');
		}
	} catch (_) {
		// ignore if import.meta not supported
	}
	// Fallback to relative
	return '';
}

export const httpClient = axios.create({
	baseURL: resolveBaseUrl(),
	timeout: 15000,
	headers: { 'Content-Type': 'application/json' },
});


