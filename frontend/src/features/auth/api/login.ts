import { api } from '../../../lib/api';

export type LoginPayload = {
  email: string;
  password: string;
};

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function login(payload: LoginPayload) {
  await api.get(`${BASE}/sanctum/csrf-cookie`, { withCredentials: true });
  const response = await api.post('/auth/login', payload);
  return response.data;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function getMe() {
  const response = await api.get('/auth/me', { _silentOn401: true });
  return response.data;
}
