import { api } from '../../../lib/api';

export type AiBriefingResponse = {
  text: string | null;
  sources: { label: string; data: string }[];
  model: string | null;
  data_date: string | null;
  sufficient: boolean;
  message?: string;
};

export type AiFeedbackPayload = {
  feature: string;
  project_id?: number;
  rating: 'positive' | 'negative';
  comment?: string;
  ai_output_excerpt?: Record<string, unknown>;
  model_used?: string;
};

export async function getAiBriefing(): Promise<AiBriefingResponse> {
  const res = await api.get('/ai/briefing', { _silentOn401: true } as object);
  return res.data;
}

export async function submitAiFeedback(payload: AiFeedbackPayload): Promise<void> {
  await api.post('/ai/feedback', payload);
}

export async function getMaterialSuggestions(projectId: number): Promise<string[]> {
  const res = await api.get(`/projects/${projectId}/ai/material-suggestions`);
  return res.data.suggestions ?? [];
}

export async function getLastDailyLog(projectId: number) {
  const res = await api.get(`/projects/${projectId}/daily-logs/last`);
  return res.data.data;
}
