import { api } from '../../../lib/api';
import type { Project, ProjectActivity } from '../../projects/types';

export type DashboardStats = {
  active_count: number;
  completed_count: number;
  draft_count: number;
  budget_active: number;
  budget_total: number;
  health_avg: number;
  health_green: number;
  health_orange: number;
  health_red: number;
  avg_progress: number;
  invoices_pending_count: number;
};

export type SituationCtPending = {
  id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  net_a_payer: number;
};

export type ProjectHealth = {
  score: number;
  status: 'green' | 'orange' | 'red';
  label: string;
  planning_score: number;
  regularity_score: number;
  budget_score: number;
  safety_score: number;
  latest_progress: number;
  target_progress: number;
  total_logs: number;
  incident_count: number;
};

export type ActiveProject = Project & { health: ProjectHealth; doc_count: number };

export type LeaderboardEntry = {
  id: number;
  name: string;
  code: string;
  score: number;
  progress: number;
  total_logs: number;
  incident_count: number;
  medal: string | null;
};

export type ProjectAlert = {
  id: string;
  type: 'overdue' | 'no_journal' | 'planning_lag' | 'open_incident' | 'health_critical';
  severity: 'critical' | 'warning';
  project_id: number;
  project_name: string;
  project_code: string;
  message: string;
  action_url: string;
};

export type DashboardData = {
  stats: DashboardStats;
  active_projects: ActiveProject[];
  recent_activities: (ProjectActivity & { project: { id: number; code: string; name: string } })[];
  leaderboard: LeaderboardEntry[];
  alerts: ProjectAlert[];
  situations_en_revue_ct: SituationCtPending[];
};

export async function getDashboard(): Promise<DashboardData> {
  const res = await api.get('/dashboard');
  return res.data;
}
