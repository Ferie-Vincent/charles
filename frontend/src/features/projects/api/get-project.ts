import { api } from '../../../lib/api';
import type { Project } from '../types';

export async function getProject(id: number): Promise<Project> {
  const response = await api.get(`/projects/${id}`);
  return response.data.data;
}
