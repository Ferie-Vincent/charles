import { api } from '../../../lib/api';

export type BesoinStatus = 'soumis' | 'approuve' | 'rejete' | 'en_preparation' | 'livre' | 'comptabilise';
export type BesoinCategory = 'materiaux' | 'equipement' | 'sous-traitance' | 'main-oeuvre' | 'autre';
export type BesoinUrgency = 'normal' | 'urgent' | 'critique';

export interface DemandeBesoin {
  id: number;
  project_id: number;
  project?: { id: number; name: string; code: string };
  requested_by: number;
  requester?: { id: number; name: string };
  title: string;
  description: string | null;
  category: BesoinCategory;
  quantity: number | null;
  unit: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  urgency: BesoinUrgency;
  status: BesoinStatus;
  approver?: { id: number; name: string } | null;
  approved_at: string | null;
  rejection_reason: string | null;
  preparer?: { id: number; name: string } | null;
  prepared_at: string | null;
  delivered_at: string | null;
  recorder?: { id: number; name: string } | null;
  recorded_at: string | null;
  budget_entry_id: number | null;
  notes: string | null;
  created_at: string;
}

export const CATEGORY_LABEL: Record<BesoinCategory, string> = {
  materiaux:       'Matériaux',
  equipement:      'Équipements',
  'sous-traitance': 'Sous-traitance',
  'main-oeuvre':   "Main d'œuvre",
  autre:           'Autre',
};

export const URGENCY_COLOR: Record<BesoinUrgency, string> = {
  normal:   '#64748b',
  urgent:   '#f59e0b',
  critique: '#ef4444',
};

export const STATUS_LABEL: Record<BesoinStatus, string> = {
  soumis:         'Soumis',
  approuve:       'Approuvé',
  rejete:         'Rejeté',
  en_preparation: 'En préparation',
  livre:          'Livré',
  comptabilise:   'Comptabilisé',
};

export const STATUS_BADGE: Record<BesoinStatus, string> = {
  soumis:         'badge-draft',
  approuve:       'badge-active',
  rejete:         'badge-overdue',
  en_preparation: 'badge-urgent',
  livre:          'badge-completed',
  comptabilise:   'badge-type-budget',
};

export const getBesoins = async (): Promise<DemandeBesoin[]> => {
  const res = await api.get('/demandes-besoins');
  return res.data.data;
};

export const createBesoin = async (data: Partial<DemandeBesoin>): Promise<DemandeBesoin> => {
  const res = await api.post('/demandes-besoins', data);
  return res.data.data;
};

export const approveBesoin = async (id: number): Promise<DemandeBesoin> => {
  const res = await api.patch(`/demandes-besoins/${id}/approve`);
  return res.data.data;
};

export const rejectBesoin = async (id: number, reason: string): Promise<DemandeBesoin> => {
  const res = await api.patch(`/demandes-besoins/${id}/reject`, { reason });
  return res.data.data;
};

export const prepareBesoin = async (id: number): Promise<DemandeBesoin> => {
  const res = await api.patch(`/demandes-besoins/${id}/prepare`);
  return res.data.data;
};

export const deliverBesoin = async (id: number): Promise<DemandeBesoin> => {
  const res = await api.patch(`/demandes-besoins/${id}/deliver`);
  return res.data.data;
};

export const recordBesoin = async (id: number, actual_cost: number): Promise<DemandeBesoin> => {
  const res = await api.patch(`/demandes-besoins/${id}/record`, { actual_cost });
  return res.data.data;
};
