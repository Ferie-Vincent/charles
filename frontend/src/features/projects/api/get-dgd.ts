import { api } from '../../../lib/api';

export type DgdStatus = 'brouillon' | 'signe_entreprise' | 'signe_moa';

export interface Dgd {
  id: number;
  project_id: number;
  montant_marche_initial: number;
  montant_avenants: number;
  montant_marche_final: number;
  total_situations_ht: number;
  penalites_retard: number;
  retenue_garantie_liberee: number;
  avance_remboursement_restant: number;
  solde_final: number;
  status: DgdStatus;
  date_signature_entreprise: string | null;
  date_signature_moa: string | null;
  observations: string | null;
  created_at: string;
}

export async function fetchDgd(projectId: number): Promise<Dgd | null> {
  const res = await api.get(`/projects/${projectId}/dgd`);
  return res.data.dgd;
}

export async function initializeDgd(projectId: number): Promise<Dgd> {
  const res = await api.post(`/projects/${projectId}/dgd/initialize`);
  return res.data.dgd;
}

export async function signDgd(projectId: number, signataire: 'entreprise' | 'moa', date: string): Promise<Dgd> {
  const res = await api.patch(`/projects/${projectId}/dgd/sign`, { signataire, date });
  return res.data.dgd;
}

export async function updateDgdObservations(projectId: number, observations: string): Promise<Dgd> {
  const res = await api.patch(`/projects/${projectId}/dgd/observations`, { observations });
  return res.data.dgd;
}
