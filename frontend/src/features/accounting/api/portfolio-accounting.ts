import { api } from '../../../lib/api';

export interface ProjectSummary {
  id: number;
  name: string;
  code: string;
  status: string;
  budget_ref: number;
  engage: number;
  realise: number;
  rac: number;
  cat: number;
  ecart: number;
  taux_realise: number;
  taux_engage: number;
}

export interface ActivityItem {
  id: string;
  type: 'invoice' | 'expense';
  date: string;
  reference?: string;
  label?: string;
  amount: number;
  status?: string;
  category: string;
  project_id?: number;
  project_name?: string;
  project_code?: string;
}

export interface GeneralExpense {
  id: number;
  category: string;
  label: string;
  amount: number;
  expense_date: string;
  paid_by?: string;
  notes?: string;
}

export interface AccountingTotals {
  budget_ref: number;
  engage: number;
  realise: number;
  rac: number;
  cat: number;
  ecart: number;
  taux_realise: number;
  taux_engage: number;
}

export interface PortfolioAccounting {
  totals: AccountingTotals;
  projects: ProjectSummary[];
  recent_activity: ActivityItem[];
  expenses: GeneralExpense[];
}

export async function getPortfolioAccounting(): Promise<PortfolioAccounting> {
  const res = await api.get('/portfolio/accounting');
  return res.data;
}

export async function createExpense(data: Partial<GeneralExpense>): Promise<GeneralExpense> {
  const res = await api.post('/expenses', data);
  return res.data;
}

export async function updateExpense(id: number, data: Partial<GeneralExpense>): Promise<GeneralExpense> {
  const res = await api.put(`/expenses/${id}`, data);
  return res.data;
}

export async function deleteExpense(id: number): Promise<void> {
  await api.delete(`/expenses/${id}`);
}
