import { api } from '../../../lib/api';

export interface DqeVersionOption {
  id: number;
  version_number: number;
  name: string;
  status: string;
  total_ht: number;
}

export interface SituationResult {
  situation: string;
  dqe_version: string;
  dqe_version_id: number;
  total_ht: number;
  avancement: number;
}

export async function getDqeVersionOptions(projectId: number): Promise<DqeVersionOption[]> {
  const res = await api.get(`/projects/${projectId}/situation-travaux/versions`);
  return res.data;
}

export async function generateSituation(
  projectId: number,
  params: { periode: string; dqe_version_id?: number; avancement?: number },
): Promise<SituationResult> {
  const res = await api.post(`/projects/${projectId}/situation-travaux`, params);
  return res.data;
}
