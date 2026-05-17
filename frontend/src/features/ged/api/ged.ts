import { api } from '../../../lib/api';

export interface GedDocument {
  id: number;
  name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  type: 'plan' | 'contrat' | 'pv' | 'rapport' | 'facture' | 'photo' | 'autre' | 'ao' | 'os' | 'marche';
  description?: string;
  created_at: string;
  project?: { id: number; name: string; code: string };
  project_id?: number;
  uploader?: { id: number; name: string };
}

export const GED_TYPES: Record<string, string> = {
  ao:      'Appel d\'offres',
  os:      'Ordre de service',
  marche:  'Marché',
  contrat: 'Contrat',
  plan:    'Plan',
  pv:      'PV',
  rapport: 'Rapport',
  facture: 'Facture',
  photo:   'Photo',
  autre:   'Autre',
};

export const GED_TYPE_COLOR: Record<string, { bg: string; color: string }> = {
  ao:      { bg: '#fef3c7', color: '#92400e' },
  os:      { bg: '#dbeafe', color: '#1e40af' },
  marche:  { bg: '#ede9fe', color: '#5b21b6' },
  contrat: { bg: '#d1fae5', color: '#065f46' },
  plan:    { bg: '#e0f2fe', color: '#0369a1' },
  pv:      { bg: '#f0fdf4', color: '#166534' },
  rapport: { bg: '#faf5ff', color: '#6b21a8' },
  facture: { bg: '#fff7ed', color: '#9a3412' },
  photo:   { bg: '#fce7f3', color: '#9d174d' },
  autre:   { bg: '#f1f5f9', color: '#475569' },
};

export const GED_TYPE_ICON: Record<string, string> = {
  ao:      '📋',
  os:      '📝',
  marche:  '🤝',
  plan:    '📐',
  contrat: '📃',
  pv:      '✅',
  rapport: '📊',
  facture: '🧾',
  photo:   '🖼️',
  autre:   '📄',
};

export function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} Mo`;
  if (bytes >= 1_024)     return `${(bytes / 1_024).toFixed(0)} Ko`;
  return `${bytes} o`;
}

export async function getDocuments(params?: {
  project_id?: number;
  type?: string;
  search?: string;
}): Promise<GedDocument[]> {
  const res = await api.get('/ged', { params });
  return res.data;
}

export async function uploadDocument(formData: FormData): Promise<GedDocument> {
  const res = await api.post('/ged', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getDocumentUrl(id: number): Promise<string> {
  const res = await api.get(`/ged/${id}/url`);
  return res.data.url;
}

export async function getDocumentContent(id: number): Promise<string> {
  const res = await api.get(`/ged/${id}/content`);
  return res.data;
}

export async function updateDocument(id: number, data: Partial<GedDocument>): Promise<GedDocument> {
  const res = await api.put(`/ged/${id}`, data);
  return res.data;
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`/ged/${id}`);
}
