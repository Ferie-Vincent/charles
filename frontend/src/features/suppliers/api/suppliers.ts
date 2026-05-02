import { api } from '../../../lib/api';

export interface GlobalSupplier {
  id: number;
  name: string;
  category: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  contract_amount?: number;
  notes?: string;
  project?: { id: number; name: string; code: string };
  invoices_count?: number;
  invoices_sum_amount_ht?: number;
  created_by?: number;
}

export const SUPPLIER_CATEGORIES: Record<string, string> = {
  travaux:        'Travaux',
  fournitures:    'Fournitures',
  services:       'Services',
  'sous-traitance': 'Sous-traitance',
  location:       'Location',
};

export async function getSuppliers(): Promise<GlobalSupplier[]> {
  const res = await api.get('/suppliers');
  return res.data;
}

export async function createSupplier(data: Partial<GlobalSupplier>): Promise<GlobalSupplier> {
  const res = await api.post('/suppliers', data);
  return res.data;
}

export async function updateSupplier(id: number, data: Partial<GlobalSupplier>): Promise<GlobalSupplier> {
  const res = await api.put(`/suppliers/${id}`, data);
  return res.data;
}

export async function deleteSupplier(id: number): Promise<void> {
  await api.delete(`/suppliers/${id}`);
}
