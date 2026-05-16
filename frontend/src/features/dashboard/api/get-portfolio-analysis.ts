import { api } from '../../../lib/api';

export interface PortfolioAnalysis {
  analysis: string;
  projects_count: number;
  generated_at: string;
}

export interface AiAction {
  title: string;
  detail: string;
  priority: 'urgent' | 'high' | 'normal';
  role_target: string;
  project_code: string | null;
}

export async function generatePortfolioAnalysis(): Promise<PortfolioAnalysis> {
  const res = await api.post('/portfolio/ai-analysis');
  return res.data;
}

export async function generateSolutions(analysis: string): Promise<AiAction[]> {
  const res = await api.post('/portfolio/ai-solutions', { analysis });
  return res.data.actions;
}

export async function assignTasks(
  tasks: Array<{
    title: string;
    detail?: string;
    priority: string;
    role_target?: string;
    project_code?: string;
    assigned_to?: number | null;
    source: 'ai';
  }>,
  idempotencyKey?: string,
): Promise<void> {
  await api.post('/tasks', {
    tasks,
    ...(idempotencyKey && { idempotency_key: idempotencyKey }),
  });
}
