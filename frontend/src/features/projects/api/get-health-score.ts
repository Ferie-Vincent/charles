import { api } from '../../../lib/api';

export type HealthScore = {
  score: number;
  label: 'good' | 'warning' | 'critical';
  planning_score: number;
  regularity_score: number;
  budget_score: number;
  safety_score: number;
  latest_progress: number;
  target_progress: number;
  total_logs: number;
  incident_count: number;
};

export async function getHealthScore(projectId: number): Promise<HealthScore> {
  const { data } = await api.get<HealthScore>(`/projects/${projectId}/health-score`);
  return data;
}
