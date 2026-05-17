import axios from 'axios';
import { api } from '../../../lib/api';

export type LoginPayload = {
  email: string;
  password: string;
};

export async function login(payload: LoginPayload) {
  await axios.get('http://localhost:8000/sanctum/csrf-cookie', { withCredentials: true });
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
