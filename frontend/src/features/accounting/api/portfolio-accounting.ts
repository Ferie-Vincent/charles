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
  source_id: number;
  type: 'invoice' | 'expense' | 'budget_entry';
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

interface UserRef { id: number; name: string }

export interface DemandeDetail {
  id: number;
  title: string;
  description?: string;
  urgency: string;
  estimated_cost?: number;
  actual_cost?: number;
  status: string;
  created_at: string;
  approved_at?: string;
  prepared_at?: string;
  delivered_at?: string;
  recorded_at?: string;
  requester?: UserRef;
  approver?: UserRef;
  preparer?: UserRef;
  recorder?: UserRef;
}

export interface ActivityDetail {
  type: 'invoice' | 'expense' | 'budget_entry';
  id: number;
  label?: string;
  reference?: string;
  amount: number;
  amount_ttc?: number;
  category: string;
  status?: string;
  entry_date?: string;
  invoice_date?: string;
  due_date?: string;
  paid_date?: string;
  expense_date?: string;
  paid_by?: string;
  note?: string;
  notes?: string;
  approved_at?: string;
  rejection_reason?: string;
  project?: { id: number; name: string; code: string };
  supplier?: { id: number; name: string };
  creator?: UserRef;
  approver?: UserRef;
  demande?: DemandeDetail;
}

export async function getActivityDetail(type: string, id: number): Promise<ActivityDetail> {
  const res = await api.get(`/portfolio/accounting/activity/${type}/${id}`);
  return res.data;
}

export interface GeneralExpense {
  id: number;
  category: string;
  label: string;
  amount: number;
  expense_date: string;
  paid_by?: string;
  notes?: string;
  status: 'en_attente' | 'approuvee' | 'rejetee';
  approver?: { id: number; name: string };
  approved_at?: string;
  rejection_reason?: string;
  creator?: { id: number; name: string };
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

export async function approveExpense(id: number): Promise<GeneralExpense> {
  const res = await api.patch(`/expenses/${id}/approve`);
  return res.data;
}

export async function rejectExpense(id: number, reason: string): Promise<GeneralExpense> {
  const res = await api.patch(`/expenses/${id}/reject`, { reason });
  return res.data;
}
