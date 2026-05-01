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

export type MaterialReceiptsData = {
  totals: MaterialTotal[];
  entries: MaterialEntry[];
};

export async function getMaterialReceipts(projectId: number): Promise<MaterialReceiptsData> {
  const res = await api.get(`/projects/${projectId}/material-receipts`);
  return res.data;
}
