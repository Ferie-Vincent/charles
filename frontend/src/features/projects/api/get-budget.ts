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
};

export type BudgetTotals = {
  previsionnel: number;
  engagement: number;
  paiement: number;
  solde: number;
  taux_engagement: number;
};

export type BudgetBucket = {
  month: string;
  previsionnel: number;
  engagement: number;
  paiement: number;
};

export type BudgetData = {
  entries: BudgetEntry[];
  totals: BudgetTotals;
  chart: BudgetBucket[];
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
