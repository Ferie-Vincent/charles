import { api } from '../../../lib/api';

export interface StockItem {
  id: number;
  name: string;
  reference?: string;
  category: string;
  unit: string;
  quantity: number;
  threshold: number;
  location?: string;
  notes?: string;
  is_low?: boolean;
  movements_count?: number;
}

export interface StockMovement {
  id: number;
  stock_item_id: number;
  type: 'entree' | 'sortie' | 'ajustement';
  quantity: number;
  reason: string;
  movement_date: string;
  notes?: string;
  creator?: { id: number; name: string };
  project?: { id: number; name: string; code: string };
}

export const STOCK_CATEGORIES: Record<string, string> = {
  materiaux:    'Matériaux',
  equipement:   'Équipement',
  fournitures:  'Fournitures',
  consommables: 'Consommables',
  autre:        'Autre',
};

export async function getStockItems(): Promise<StockItem[]> {
  const res = await api.get('/stock-items');
  return res.data;
}

export async function createStockItem(data: Partial<StockItem>): Promise<StockItem> {
  const res = await api.post('/stock-items', data);
  return res.data;
}

export async function updateStockItem(id: number, data: Partial<StockItem>): Promise<StockItem> {
  const res = await api.put(`/stock-items/${id}`, data);
  return res.data;
}

export async function deleteStockItem(id: number): Promise<void> {
  await api.delete(`/stock-items/${id}`);
}

export async function getMovements(itemId: number): Promise<StockMovement[]> {
  const res = await api.get(`/stock-items/${itemId}/movements`);
  return res.data;
}

export async function addMovement(
  itemId: number,
  data: Partial<StockMovement>
): Promise<{ movement: StockMovement; stock: StockItem }> {
  const res = await api.post(`/stock-items/${itemId}/movements`, data);
  return res.data;
}
