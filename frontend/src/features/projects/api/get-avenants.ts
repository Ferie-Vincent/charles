import { api } from '../../../lib/api';

export type AvenantType   = 'montant' | 'delai' | 'montant_et_delai';
export type AvenantStatut = 'brouillon' | 'soumis' | 'signe' | 'refuse';

export interface Avenant {
  id: number;
  numero: string;
  objet: string;
  type: AvenantType;
  montant_ht: number;
  delai_supplementaire_jours: number | null;
  status: AvenantStatut;
  date_signature: string | null;
  notes: string | null;
  created_at: string;
  creator: { id: number; name: string } | null;
}

export interface AvenantsData {
  avenants: Avenant[];
  total_avenants: number;
  montant_final: number;
}

export async function fetchAvenants(projectId: number): Promise<AvenantsData> {
  const res = await api.get(`/projects/${projectId}/avenants`);
  return res.data;
}

export async function createAvenant(projectId: number, data: {
  objet: string;
  type: AvenantType;
  montant_ht?: number;
  delai_supplementaire_jours?: number;
  notes?: string;
}): Promise<Avenant> {
  const res = await api.post(`/projects/${projectId}/avenants`, data);
  return res.data.avenant;
}

export async function updateAvenant(projectId: number, avenantId: number, data: Partial<{
  objet: string;
  type: AvenantType;
  montant_ht: number;
  delai_supplementaire_jours: number;
  status: AvenantStatut;
  date_signature: string;
  notes: string;
}>): Promise<Avenant> {
  const res = await api.patch(`/projects/${projectId}/avenants/${avenantId}`, data);
  return res.data.avenant;
}

export async function deleteAvenant(projectId: number, avenantId: number): Promise<void> {
  await api.delete(`/projects/${projectId}/avenants/${avenantId}`);
}
