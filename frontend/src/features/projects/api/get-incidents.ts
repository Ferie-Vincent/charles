import { api } from '../../../lib/api';

export type Incident = {
  id: number;
  project_id: number;
  reported_by: number;
  type: string;
  severity: 'mineur' | 'majeur' | 'critique';
  description: string;
  location: string | null;
  corrective_action: string | null;
  witnesses: string | null;
  status: 'ouvert' | 'en_cours' | 'resolu' | 'ferme';
  occurred_at: string;
  resolved_at: string | null;
  created_at: string;
  reporter?: { id: number; name: string };
};

export type IncidentInput = {
  type: string;
  severity: Incident['severity'];
  description: string;
  location?: string;
  corrective_action?: string;
  witnesses?: string;
  occurred_at: string;
};

export async function getIncidents(projectId: number): Promise<Incident[]> {
  const res = await api.get(`/projects/${projectId}/incidents`);
  return res.data;
}

export async function createIncident(projectId: number, data: IncidentInput): Promise<Incident> {
  const res = await api.post(`/projects/${projectId}/incidents`, data);
  return res.data;
}

export async function updateIncident(
  projectId: number,
  incidentId: number,
  data: Partial<Pick<Incident, 'status' | 'corrective_action' | 'resolved_at'>>
): Promise<Incident> {
  const res = await api.patch(`/projects/${projectId}/incidents/${incidentId}`, data);
  return res.data;
}

export async function deleteIncident(projectId: number, incidentId: number): Promise<void> {
  await api.delete(`/projects/${projectId}/incidents/${incidentId}`);
}

export function incidentPdfUrl(projectId: number, incidentId: number): string {
  return `http://localhost:8000/api/projects/${projectId}/incidents/${incidentId}/pdf`;
}
