import { api } from '../../../lib/api';

export type SituationStatut = 'brouillon' | 'soumise' | 'validee_moe' | 'payee';

export interface Situation {
  id: number;
  numero: string;
  periode: string;
  avancement_pct: number;
  montant_brut_ht: number;
  cumul_precedent_ht: number;
  retenue_garantie_pct: number;
  retenue_garantie_amount: number;
  avance_remboursement: number;
  vat_rate: number;
  vat_amount: number;
  net_a_payer: number;
  status: SituationStatut;
  notes: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  paid_at: string | null;
  date_paiement: string | null;
  created_at: string;
  creator: { id: number; name: string } | null;
  dqe_version: { id: number; name: string; version_number: number } | null;
}

export async function fetchSituations(projectId: number): Promise<Situation[]> {
  const res = await api.get(`/projects/${projectId}/situations`);
  return res.data.situations;
}

export async function createSituation(projectId: number, data: {
  periode: string;
  avancement_pct: number;
  montant_brut_ht: number;
  dqe_version_id?: number | null;
  notes?: string;
}): Promise<Situation> {
  const res = await api.post(`/projects/${projectId}/situations`, data);
  return res.data.situation;
}

export async function submitSituation(projectId: number, situationId: number): Promise<Situation> {
  const res = await api.patch(`/projects/${projectId}/situations/${situationId}/submit`);
  return res.data.situation;
}

export async function validateSituation(projectId: number, situationId: number): Promise<Situation> {
  const res = await api.patch(`/projects/${projectId}/situations/${situationId}/validate`);
  return res.data.situation;
}

export async function paySituation(projectId: number, situationId: number, date_paiement: string): Promise<Situation> {
  const res = await api.patch(`/projects/${projectId}/situations/${situationId}/pay`, { date_paiement });
  return res.data.situation;
}
