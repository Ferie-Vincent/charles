import { api } from '../../../lib/api';
import type { DailyLog } from '../types';

export type DailyLogMeta = {
  total_logs: number;
  latest_progress: number | null;
  incident_count: number;
  avg_workers: number | null;
};

export type DailyLogsResponse = {
  data: DailyLog[];
  meta: DailyLogMeta;
};

export async function getDailyLogs(projectId: number): Promise<DailyLogsResponse> {
  const response = await api.get(`/projects/${projectId}/daily-logs`);
  return response.data;
}
