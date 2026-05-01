import { api } from '../../../lib/api';

export type ProjectReportMeta = {
  id: number;
  filename: string;
  week_of: string;
  size_bytes: number;
  type: 'hebdo' | 'manuel';
  created_at: string;
};

export async function getReports(projectId: number): Promise<ProjectReportMeta[]> {
  const res = await api.get(`/projects/${projectId}/reports`);
  return res.data;
}

export function reportDownloadUrl(projectId: number, reportId: number): string {
  return `http://localhost:8000/api/projects/${projectId}/reports/${reportId}/download`;
}
