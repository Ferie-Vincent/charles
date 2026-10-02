import { api } from '../../../lib/api';

export type BudgetEntryType = 'previsionnel' | 'engagement' | 'paiement';

export type BudgetEntry = {
  id: number;
  project_id: number;
  type: BudgetEntryType;
  category: string;
  label: string;
  amount: string;
  entry_date: string;
  note: string | null;
  created_at: string;
  situation_travaux_id?: number | null;
  situation_travaux?: { id: number; numero: string } | null;
};

export type BudgetTotals = {
  previsionnel: number;
  engagement: number;
  paiement: number;
  solde: number;
  taux_engagement: number;
  /** Situations ≥ soumise non payées — argent dû par le MOA */
  creances_en_attente: number;
  delai_paiement_jours: number;
};

export type BudgetBucket = {
  month: string;
  previsionnel: number;
  engagement: number;
  paiement: number;
  /** Encaissements attendus (créances MOA datées par le délai de paiement) */
  encaissement: number;
};

export type Creance = {
  id: number;
  numero: string;
  periode: string;
  status: string;
  amount: number;
  expected_date: string;
  overdue: boolean;
  basis: 'service_fait' | 'validation_moe' | 'soumission' | 'creation';
};

export type OrphanPayment = {
  id: number;
  label: string;
  amount: string;
  entry_date: string;
  category: string;
};

export type BudgetData = {
  entries: BudgetEntry[];
  totals: BudgetTotals;
  chart: BudgetBucket[];
  orphan_payments: OrphanPayment[];
  creances: Creance[];
};

export type BudgetEntryInput = {
  type: BudgetEntryType;
  category: string;
  label: string;
  amount: number;
  entry_date: string;
  note?: string;
};

export async function getBudget(projectId: number): Promise<BudgetData> {
  const res = await api.get(`/projects/${projectId}/budget`);
  return res.data;
}

export async function createBudgetEntry(projectId: number, data: BudgetEntryInput): Promise<BudgetEntry> {
  const res = await api.post(`/projects/${projectId}/budget/entries`, data);
  return res.data;
}

export async function deleteBudgetEntry(projectId: number, entryId: number): Promise<void> {
  await api.delete(`/projects/${projectId}/budget/entries/${entryId}`);
}
