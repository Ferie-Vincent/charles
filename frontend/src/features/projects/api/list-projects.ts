import { api } from '../../../lib/api';
import type { Project } from '../types';

export async function listProjects(): Promise<Project[]> {
  const response = await api.get('/projects');
  return response.data.data;
}
