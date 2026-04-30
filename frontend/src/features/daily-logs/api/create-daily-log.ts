import { api } from '../../../lib/api';
import type { CreateDailyLogPayload, DailyLog } from '../types';

export async function createDailyLog(projectId: number, payload: CreateDailyLogPayload): Promise<DailyLog> {
  const response = await api.post(`/projects/${projectId}/daily-logs`, payload);
  return response.data.data;
}
