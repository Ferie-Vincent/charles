import { api } from '../../../lib/api';

export type PortfolioReportStats = {
  total_reports: number;
  hebdo_count: number;
  manuel_count: number;
  projects_with_reports: number;
};

export type PortfolioReport = {
  id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  filename: string;
  week_of: string;
  size_bytes: number;
  type: 'hebdo' | 'manuel';
  created_at: string;
};

export type PortfolioReportsResponse = {
  stats: PortfolioReportStats;
  reports: PortfolioReport[];
};

export async function getPortfolioReports(): Promise<PortfolioReportsResponse> {
  const { data } = await api.get<PortfolioReportsResponse>('/portfolio/reports');
  return data;
}

export function reportDownloadUrl(projectId: number, reportId: number): string {
  return `http://localhost:8000/api/projects/${projectId}/reports/${reportId}/download`;
}
