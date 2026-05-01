import { api } from '../../../lib/api';

export type SafetyScore = {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  counts: { mineur: number; majeur: number; critique: number; total: number };
  resolved: number;
  period: string;
};

export async function getSafetyScore(projectId: number): Promise<SafetyScore> {
  const res = await api.get(`/projects/${projectId}/safety-score`);
  return res.data;
}
