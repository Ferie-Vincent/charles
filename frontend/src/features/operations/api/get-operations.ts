import { api } from '../../../lib/api';

export interface HealthSummary {
  avg_score: number;
  critical_count: number;
  total_active: number;
}

export interface BudgetSummary {
  previsionnel: number;
  engage: number;
  realise: number;
  tauxEngage: number;
  tauxRealise: number;
}

export interface BdcPending {
  id: number;
  reference: string;
  supplier: string;
  total_amount: number;
  age_days: number;
  project: { id: number; name: string; code: string } | null;
}

export interface StockAlert {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  threshold: number;
  deficit: number;
}

export interface CriticalProject {
  id: number;
  name: string;
  code: string;
  health_score: number;
  health_label: 'critical' | 'warning' | 'good';
}

export interface OperationsData {
  health_summary: HealthSummary;
  budget_summary: BudgetSummary;
  bdc_pending: BdcPending[];
  stock_alerts: StockAlert[];
  critical_projects: CriticalProject[];
}

export async function getOperations(): Promise<OperationsData> {
  const res = await api.get('/portfolio/operations');
  return res.data;
}
