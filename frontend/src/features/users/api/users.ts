import { api } from '../../../lib/api';

export interface Role {
  id: number;
  name: string;
  label: string;
}

export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface UserPayload {
  name: string;
  email: string;
  role_id: number;
  password?: string;
}

export async function getUsers(): Promise<AppUser[]> {
  const res = await api.get('/users');
  return res.data;
}

export async function getRoles(): Promise<Role[]> {
  const res = await api.get('/users/roles');
  return res.data;
}

export async function createUser(payload: UserPayload & { password: string }): Promise<AppUser> {
  const res = await api.post('/users', payload);
  return res.data;
}

export async function updateUser(id: number, payload: UserPayload): Promise<AppUser> {
  const res = await api.put(`/users/${id}`, payload);
  return res.data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}
