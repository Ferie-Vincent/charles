const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE = isLocalhost
  ? (import.meta.env.VITE_API_URL ?? 'http://localhost:8000')
  : '';

export const CSRF_URL = `${API_BASE}/sanctum/csrf-cookie`;
