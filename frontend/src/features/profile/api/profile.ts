import { api } from '../../../lib/api';
import type { AuthUser } from '../../auth/stores/auth-store';

export async function updateProfile(data: { name: string; email: string }): Promise<AuthUser> {
  const res = await api.put('/profile', data);
  return res.data.user;
}

export async function changePassword(data: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await api.put('/profile/password', data);
}

export async function updateCompany(name: string): Promise<{ id: number; name: string }> {
  const res = await api.put('/company', { name });
  return res.data.company;
}
