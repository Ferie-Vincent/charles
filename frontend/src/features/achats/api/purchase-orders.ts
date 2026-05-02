import { api } from '../../../lib/api';

export interface OrderItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface PurchaseOrder {
  id: number;
  reference: string;
  status: 'brouillon' | 'soumis' | 'approuve' | 'rejete' | 'recu' | 'annule';
  items: OrderItem[];
  total_amount: number;
  expected_delivery?: string;
  notes?: string;
  rejection_reason?: string;
  approved_at?: string;
  received_at?: string;
  delivery_note_path?: string;
  delivery_photos?: string[];
  reception_notes?: string;
  created_at: string;
  supplier?: { id: number; name: string };
  supplier_id?: number;
  project?: { id: number; name: string; code: string };
  project_id?: number;
  requester?: { id: number; name: string };
  approver?: { id: number; name: string };
}

export interface DeliveryDocs {
  delivery_note_url: string | null;
  photo_urls: string[];
  reception_notes: string | null;
  received_at: string | null;
}

export const BDC_STATUS_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  soumis:    'Soumis',
  approuve:  'Approuvé',
  rejete:    'Rejeté',
  recu:      'Reçu',
  annule:    'Annulé',
};

export const BDC_STATUS_COLOR: Record<string, string> = {
  brouillon: '#94a3b8',
  soumis:    '#f59e0b',
  approuve:  '#3b7ddd',
  rejete:    '#ef4444',
  recu:      '#10b981',
  annule:    '#64748b',
};

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  const res = await api.get('/purchase-orders');
  return res.data;
}

export async function createPurchaseOrder(data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  const res = await api.post('/purchase-orders', data);
  return res.data;
}

export async function updatePurchaseOrder(id: number, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
  const res = await api.put(`/purchase-orders/${id}`, data);
  return res.data;
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  await api.delete(`/purchase-orders/${id}`);
}

export async function approvePurchaseOrder(id: number): Promise<PurchaseOrder> {
  const res = await api.patch(`/purchase-orders/${id}/approve`);
  return res.data;
}

export async function rejectPurchaseOrder(id: number, reason: string): Promise<PurchaseOrder> {
  const res = await api.patch(`/purchase-orders/${id}/reject`, { reason });
  return res.data;
}

export async function receivePurchaseOrder(id: number, formData: FormData): Promise<PurchaseOrder> {
  const res = await api.patch(`/purchase-orders/${id}/receive`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getDeliveryDocs(id: number): Promise<DeliveryDocs> {
  const res = await api.get(`/purchase-orders/${id}/delivery-docs`);
  return res.data;
}
