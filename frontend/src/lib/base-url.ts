export const API_BASE = import.meta.env.VITE_API_URL ?? '';

export const CSRF_URL = `${API_BASE}/sanctum/csrf-cookie`;
