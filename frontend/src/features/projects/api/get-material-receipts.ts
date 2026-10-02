import { api } from '../../../lib/api';

export type MaterialTotal = {
  name: string;
  total_qty: number;
  unit: string;
  last_date: string;
  delivery_count: number;
};

export type MaterialEntry = {
  date: string;
  name: string;
  quantity: number;
  unit: string;
};

/** Rapprochement journal (reçu sur site) ↔ stock central (sorties imputées au chantier) */
export type MaterialReconciliation = {
  name: string;
  unit: string;
  journal_qty: number;
  stock_qty: number;
  ecart_qty: number;
  stock_value: number;
  status: 'ok' | 'ecart' | 'journal_only' | 'stock_only';
};

export type MaterialReceiptsData = {
  totals: MaterialTotal[];
  entries: MaterialEntry[];
  rapprochement: MaterialReconciliation[];
};

export async function getMaterialReceipts(projectId: number): Promise<MaterialReceiptsData> {
  const res = await api.get(`/projects/${projectId}/material-receipts`);
  return res.data;
}
