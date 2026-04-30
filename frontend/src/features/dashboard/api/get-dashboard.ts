import { api } from '../../../lib/api';
import type { Project, ProjectActivity } from '../../projects/types';

export type DashboardStats = {
  active_count: number;
  completed_count: number;
  draft_count: number;
  budget_active: number;
  budget_total: number;
};

export type DashboardData = {
  stats: DashboardStats;
  active_projects: Project[];
  recent_activities: (ProjectActivity & { project: { id: number; code: string; name: string } })[];
};

export async function getDashboard(): Promise<DashboardData> {
  const res = await api.get('/dashboard');
  return res.data;
}
