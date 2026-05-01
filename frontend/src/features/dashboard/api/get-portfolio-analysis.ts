import { api } from '../../../lib/api';

export interface PortfolioAnalysis {
  analysis: string;
  projects_count: number;
  generated_at: string;
}

export async function generatePortfolioAnalysis(): Promise<PortfolioAnalysis> {
  const res = await api.post('/portfolio/ai-analysis');
  return res.data;
}
