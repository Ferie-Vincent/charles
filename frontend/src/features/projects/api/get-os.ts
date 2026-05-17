import { api } from '../../../lib/api';

export type OsType = 'demarrage' | 'travaux_supplementaires' | 'arret' | 'reprise' | 'autre';

export interface OrdreDeService {
  id: number;
  numero: string;
  objet: string;
  type: OsType;
  date_emission: string;
  date_execution: string | null;
  accuse_reception: boolean;
  date_accuse: string | null;
  notes: string | null;
  document_url: string | null;
  created_at: string;
  emetteur: { id: number; name: string } | null;
}

export async function fetchOrdresDeService(projectId: number): Promise<OrdreDeService[]> {
  const res = await api.get(`/projects/${projectId}/os`);
  return res.data.ordres;
}

export async function createOs(projectId: number, data: {
  objet: string;
  type: OsType;
  date_emission: string;
  date_execution?: string;
  notes?: string;
}): Promise<OrdreDeService> {
  const res = await api.post(`/projects/${projectId}/os`, data);
  return res.data.os;
}

export async function accuserOs(projectId: number, osId: number): Promise<OrdreDeService> {
  const res = await api.patch(`/projects/${projectId}/os/${osId}/accuser`);
  return res.data.os;
}
