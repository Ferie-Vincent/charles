import { api } from '../../../lib/api';

export async function updateProfile(data: { name: string; email: string }) {
  const res = await api.put('/profile', data);
  return res.data;
}

export async function changePassword(data: {
  current_password: string;
  password: string;
  password_confirmation: string;
}) {
  const res = await api.put('/profile/password', data);
  return res.data;
}

export async function updateCompany(data: { name: string }) {
  const res = await api.put('/profile/company', data);
  return res.data;
}

/* ── Notification preferences (localStorage) ─── */

const NOTIF_KEY = 'chantier:notif_prefs';

export interface NotifPrefs {
  whatsapp_enabled: boolean;
  whatsapp_number: string;
  rapport_hebdo: boolean;
  alert_bdc: boolean;
  alert_stock: boolean;
  alert_critique: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  whatsapp_enabled: false,
  whatsapp_number: '',
  rapport_hebdo: true,
  alert_bdc: true,
  alert_stock: true,
  alert_critique: true,
};

export function getNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveNotifPrefs(prefs: NotifPrefs): void {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
}
