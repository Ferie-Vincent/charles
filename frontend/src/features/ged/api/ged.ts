import { api } from '../../../lib/api';

export interface GedDocument {
  id: number;
  name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  type: 'plan' | 'contrat' | 'pv' | 'rapport' | 'facture' | 'photo' | 'autre';
  description?: string;
  created_at: string;
  project?: { id: number; name: string; code: string };
  project_id?: number;
  uploader?: { id: number; name: string };
}

export const GED_TYPES: Record<string, string> = {
  plan:     'Plan',
  contrat:  'Contrat',
  pv:       'PV',
  rapport:  'Rapport',
  facture:  'Facture',
  photo:    'Photo',
  autre:    'Autre',
};

export const GED_TYPE_ICON: Record<string, string> = {
  plan:    '📐',
  contrat: '📋',
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

export async function updateDocument(id: number, data: Partial<GedDocument>): Promise<GedDocument> {
  const res = await api.put(`/ged/${id}`, data);
  return res.data;
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`/ged/${id}`);
}
