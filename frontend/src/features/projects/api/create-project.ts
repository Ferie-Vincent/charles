import { api } from '../../../lib/api';
import type { CreateProjectPayload, Project } from '../types';

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const response = await api.post('/projects', payload);
  return response.data.data;
}
