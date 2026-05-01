import { api } from '../../../lib/api';

export type QhseStats = {
  total_incidents: number;
  open_incidents: number;
  critique_count: number;
  avg_safety_score: number;
};

export type QhseIncident = {
  id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  type: string;
  severity: 'mineur' | 'majeur' | 'critique';
  description: string;
  status: 'ouvert' | 'en_cours' | 'resolu' | 'ferme';
  occurred_at: string;
  reporter_name: string;
};

export type SafetyByProject = {
  project_id: number;
  project_name: string;
  project_code: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  mineur: number;
  majeur: number;
  critique: number;
};

export type PortfolioQhseData = {
  stats: QhseStats;
  incidents: QhseIncident[];
  safety_by_project: SafetyByProject[];
};

export async function getPortfolioQhse(): Promise<PortfolioQhseData> {
  const { data } = await api.get<PortfolioQhseData>('/portfolio/qhse');
  return data;
}
