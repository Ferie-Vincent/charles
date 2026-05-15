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

export type TypeFacturation = 'facture' | 'situation_travaux' | 'acompte' | 'decompte_final';

export interface Invoice {
  id: number;
  reference: string;
  category: string;
  type_facturation: TypeFacturation;
  amount_ht: number;
  amount_ttc?: number;
  vat_rate?: number;
  vat_amount?: number;
  retenue_garantie_pct?: number;
  retenue_garantie_amount?: number;
  ras_pct?: number;
  ras_amount?: number;
  net_a_payer?: number;
  status: 'brouillon' | 'soumise' | 'validee' | 'payee' | 'disputee';
  invoice_date: string;
  due_date?: string;
  paid_date?: string;
  note?: string;
  supplier?: { id: number; name: string };
  supplier_id?: number;
  purchase_order_id?: number | null;
  attachment_path?: string;
  attachment_name?: string;
  // workflow
  validated_by?: number;
  validated_at?: string;
  validator?: { id: number; name: string };
  paid_by?: number;
  paid_at?: string;
  payer?: { id: number; name: string };
  payment_proof_path?: string;
  payment_proof_name?: string;
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

function toFormData(data: Partial<Invoice> & { attachment?: File | null }): FormData | Partial<Invoice> {
  if (!data.attachment) return data;
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (k === 'attachment' && v instanceof File) fd.append('attachment', v);
    else if (v !== undefined && v !== null && k !== 'supplier') fd.append(k, String(v));
  });
  return fd;
}

export async function createInvoice(projectId: number, data: Partial<Invoice> & { attachment?: File | null }): Promise<Invoice> {
  const body = toFormData(data);
  const res = await api.post(`/projects/${projectId}/invoices`, body, {
    headers: body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
  return res.data;
}

export async function updateInvoice(projectId: number, id: number, data: Partial<Invoice> & { attachment?: File | null }): Promise<Invoice> {
  const body = toFormData(data);
  const res = await api.put(`/projects/${projectId}/invoices/${id}`, body, {
    headers: body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
  return res.data;
}

export async function deleteInvoice(projectId: number, id: number): Promise<void> {
  await api.delete(`/projects/${projectId}/invoices/${id}`);
}

export function invoiceAttachmentUrl(projectId: number, invoiceId: number): string {
  return `http://localhost:8000/api/projects/${projectId}/invoices/${invoiceId}/attachment`;
}

export function invoicePaymentProofUrl(projectId: number, invoiceId: number): string {
  return `http://localhost:8000/api/projects/${projectId}/invoices/${invoiceId}/payment-proof`;
}

export async function validateInvoice(projectId: number, invoiceId: number): Promise<Invoice> {
  const res = await api.patch(`/projects/${projectId}/invoices/${invoiceId}/transition`, { status: 'validee' });
  return res.data;
}

export async function payInvoice(
  projectId: number,
  invoiceId: number,
  data: { paid_date: string; payment_proof: File; note?: string },
): Promise<Invoice> {
  const fd = new FormData();
  fd.append('paid_date', data.paid_date);
  fd.append('payment_proof', data.payment_proof);
  if (data.note) fd.append('note', data.note);
  const res = await api.post(`/projects/${projectId}/invoices/${invoiceId}/pay`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
