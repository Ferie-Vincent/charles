import { api } from '../../../lib/api';
import type { DqeVersion, DqeVersionDetail, DqeLineInput, DqeStatus } from '../types';

// ── Versions ──────────────────────────────────────────────────────────────────

export async function getDqeVersions(projectId: number): Promise<DqeVersion[]> {
  const { data } = await api.get<DqeVersion[]>(`/projects/${projectId}/dqe-versions`);
  return data;
}

export async function getDqeVersion(projectId: number, versionId: number): Promise<DqeVersionDetail> {
  const { data } = await api.get<DqeVersionDetail>(`/projects/${projectId}/dqe-versions/${versionId}`);
  return data;
}

export async function createDqeVersion(
  projectId: number,
  payload: { name: string; notes?: string },
): Promise<DqeVersion> {
  const { data } = await api.post<DqeVersion>(`/projects/${projectId}/dqe-versions`, payload);
  return data;
}

export async function updateDqeVersion(
  projectId: number,
  versionId: number,
  payload: { name?: string; status?: DqeStatus; notes?: string },
): Promise<DqeVersion> {
  const { data } = await api.put<DqeVersion>(
    `/projects/${projectId}/dqe-versions/${versionId}`,
    payload,
  );
  return data;
}

export async function deleteDqeVersion(projectId: number, versionId: number): Promise<void> {
  await api.delete(`/projects/${projectId}/dqe-versions/${versionId}`);
}

export async function duplicateDqeVersion(projectId: number, versionId: number): Promise<DqeVersion> {
  const { data } = await api.post<DqeVersion>(
    `/projects/${projectId}/dqe-versions/${versionId}/duplicate`,
  );
  return data;
}

// ── Lines ─────────────────────────────────────────────────────────────────────

export async function createDqeLine(
  projectId: number,
  versionId: number,
  payload: DqeLineInput,
) {
  const { data } = await api.post(
    `/projects/${projectId}/dqe-versions/${versionId}/lines`,
    payload,
  );
  return data;
}

export async function updateDqeLine(
  projectId: number,
  versionId: number,
  lineId: number,
  payload: Partial<DqeLineInput>,
) {
  const { data } = await api.put(
    `/projects/${projectId}/dqe-versions/${versionId}/lines/${lineId}`,
    payload,
  );
  return data;
}

export async function deleteDqeLine(
  projectId: number,
  versionId: number,
  lineId: number,
): Promise<void> {
  await api.delete(`/projects/${projectId}/dqe-versions/${versionId}/lines/${lineId}`);
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export async function downloadDqePdf(
  projectId: number,
  versionId: number,
  filename: string,
): Promise<void> {
  const response = await api.get(
    `/projects/${projectId}/dqe-versions/${versionId}/pdf`,
    { responseType: 'blob' },
  );
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

export type PortfolioDqeItem = {
  id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  project_status: string;
  version_number: number;
  name: string;
  status: DqeStatus;
  total_ht: number;
  lines_count: number;
  updated_at: string;
};

export async function getPortfolioDqe(): Promise<PortfolioDqeItem[]> {
  const { data } = await api.get<PortfolioDqeItem[]>('/portfolio/dqe');
  return data;
}
