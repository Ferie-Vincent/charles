import { api } from '../../../lib/api';

export const TRADES = [
  'Maçon',
  'Coffreur',
  'Ferrailleur',
  'Charpentier',
  'Menuisier',
  'Plombier',
  'Électricien',
  'Carreleur',
  'Peintre',
  'Soudeur',
  'Grutier',
  "Conducteur d'engins",
  'Chauffeur',
  'Manœuvre',
  "Chef d'équipe",
  'Contremaître',
  'Autre',
] as const;

export type Trade = typeof TRADES[number];

export type AttendanceStatut = 'present' | 'absent' | 'conge' | 'maladie' | 'demi_journee';

export const STATUT_OPTIONS: { value: AttendanceStatut; label: string; color: string }[] = [
  { value: 'present',      label: 'Présent',      color: '#22c55e' },
  { value: 'absent',       label: 'Absent',        color: '#ef4444' },
  { value: 'conge',        label: 'Congé',         color: '#f59e0b' },
  { value: 'maladie',      label: 'Maladie',       color: '#8b5cf6' },
  { value: 'demi_journee', label: 'Demi-journée',  color: '#3b82f6' },
];

export interface WorkerAttendance {
  id: number;
  present: boolean;
  statut: AttendanceStatut;
  heures_normales: number;
  heures_sup: number;
  task_assigned: string | null;
}

export interface Worker {
  id: number;
  name: string;
  trade: string;
  phone: string | null;
  is_active: boolean;
  attendance: WorkerAttendance | null;
}

export async function fetchWorkers(projectId: number, date: string): Promise<Worker[]> {
  const res = await api.get(`/projects/${projectId}/workers`, { params: { date } });
  return res.data.workers;
}

export async function createWorker(projectId: number, data: {
  name: string; trade: string; phone?: string;
}): Promise<Worker> {
  const res = await api.post(`/projects/${projectId}/workers`, data);
  return res.data.worker;
}

export async function updateWorker(projectId: number, workerId: number, data: Partial<{
  name: string; trade: string; phone: string | null; is_active: boolean;
}>): Promise<Worker> {
  const res = await api.patch(`/projects/${projectId}/workers/${workerId}`, data);
  return res.data.worker;
}

export async function deleteWorker(projectId: number, workerId: number): Promise<void> {
  await api.delete(`/projects/${projectId}/workers/${workerId}`);
}

export async function upsertAttendance(projectId: number, data: {
  worker_id: number;
  log_date: string;
  statut: AttendanceStatut;
  heures_normales?: number;
  heures_sup?: number;
  task_assigned?: string | null;
}): Promise<WorkerAttendance> {
  const res = await api.post(`/projects/${projectId}/workers/attendance`, data);
  return res.data.attendance;
}

export async function exportAttendancePdf(projectId: number, dateFrom: string, dateTo: string): Promise<void> {
  const res = await api.get(`/projects/${projectId}/workers/export`, {
    params: { date_from: dateFrom, date_to: dateTo },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `pointage-${projectId}-${dateFrom}_${dateTo}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
