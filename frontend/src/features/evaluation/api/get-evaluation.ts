import { api } from '../../../lib/api';

export type ProjectEvaluation = {
  id: number;
  name: string;
  code: string;
  status: string;
  progress_percent: number;
  target_progress: number;
  health_score: number;
  health_label: 'good' | 'warning' | 'critical';
  planning_score: number;
  regularity_score: number;
  budget_score: number;
  safety_score: number;
  total_logs: number;
  incident_count: number;
};

export async function getEvaluation(): Promise<ProjectEvaluation[]> {
  const { data } = await api.get<ProjectEvaluation[]>('/portfolio/evaluation');
  return data;
}
