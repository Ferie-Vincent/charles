import { api } from '../../../lib/api';

export interface Supplier {
  id: number;
  name: string;
  category: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  contract_amount: number;
  billed?: number;
  paid?: number;
  notes?: string;
}

export interface Invoice {
  id: number;
  reference: string;
  category: string;
  amount_ht: number;
  amount_ttc?: number;
  status: 'brouillon' | 'soumise' | 'validee' | 'payee' | 'disputee';
  invoice_date: string;
  due_date?: string;
  paid_date?: string;
  note?: string;
  supplier?: { id: number; name: string };
  supplier_id?: number;
}

export interface CategoryBreakdown {
  realise: number;
  engage: number;
  count: number;
}

export interface ProjectAccounting {
  budget_ref: number;
  dqe_total: number;
  previsionnel: number;
  engage: number;
  realise: number;
  rac: number;
  cat: number;
  ecart: number;
  taux_realisation: number;
  taux_engagement: number;
  by_category: Record<string, CategoryBreakdown>;
  suppliers: Supplier[];
  invoices: Invoice[];
  upcoming: Invoice[];
}

export async function getProjectAccounting(projectId: number): Promise<ProjectAccounting> {
  const res = await api.get(`/projects/${projectId}/accounting`);
  return res.data;
}

export async function getSuppliers(projectId: number): Promise<Supplier[]> {
  const res = await api.get(`/projects/${projectId}/suppliers`);
  return res.data;
}

export async function createSupplier(projectId: number, data: Partial<Supplier>): Promise<Supplier> {
  const res = await api.post(`/projects/${projectId}/suppliers`, data);
  return res.data;
}

export async function updateSupplier(projectId: number, id: number, data: Partial<Supplier>): Promise<Supplier> {
  const res = await api.put(`/projects/${projectId}/suppliers/${id}`, data);
  return res.data;
}

export async function deleteSupplier(projectId: number, id: number): Promise<void> {
  await api.delete(`/projects/${projectId}/suppliers/${id}`);
}

export async function createInvoice(projectId: number, data: Partial<Invoice>): Promise<Invoice> {
  const res = await api.post(`/projects/${projectId}/invoices`, data);
  return res.data;
}

export async function updateInvoice(projectId: number, id: number, data: Partial<Invoice>): Promise<Invoice> {
  const res = await api.put(`/projects/${projectId}/invoices/${id}`, data);
  return res.data;
}

export async function deleteInvoice(projectId: number, id: number): Promise<void> {
  await api.delete(`/projects/${projectId}/invoices/${id}`);
}
