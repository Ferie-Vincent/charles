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

/* ── Préférences de notification (localStorage) ─── */

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

/* ── Paramètres IA ──────────────────────────────── */

export interface AiSettings {
  ai_enabled: boolean;
  ai_provider: 'mistral' | 'groq' | 'anthropic' | null;
  has_api_key: boolean;
}

export async function getAiSettings(): Promise<AiSettings> {
  const res = await api.get('/settings/ai');
  return res.data;
}

export async function updateAiSettings(data: {
  ai_enabled: boolean;
  ai_provider?: string | null;
  ai_api_key?: string;
}): Promise<AiSettings> {
  const res = await api.put('/settings/ai', data);
  return res.data;
}

export async function testAiConnection(provider: string, api_key: string): Promise<boolean> {
  try {
    const res = await api.post('/settings/ai/test', { provider, api_key });
    return res.data.ok === true;
  } catch {
    return false;
  }
}
