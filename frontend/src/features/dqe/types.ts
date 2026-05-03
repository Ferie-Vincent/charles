export type DqeStatus = 'draft' | 'soumise' | 'validated' | 'archived';

export type DqeVersion = {
  id: number;
  project_id: number;
  created_by: number;
  version_number: number;
  name: string;
  status: DqeStatus;
  total_ht: number;
  notes: string | null;
  lines_count?: number;
  created_at: string;
  updated_at: string;
};

export type DqeLine = {
  id: number;
  dqe_version_id: number;
  lot: string;
  ouvrage: string;
  unite: string;
  quantite: number;
  prix_unitaire: number;
  montant_ht: number;
  ordre: number;
  created_at: string;
};

export type DqeLot = {
  lot: string;
  lines: DqeLine[];
  subtotal: number;
};

export type DqeVersionDetail = {
  version: DqeVersion;
  lots: DqeLot[];
};

export type DqeLineInput = {
  lot: string;
  ouvrage: string;
  unite: string;
  quantite: number;
  prix_unitaire: number;
  ordre?: number;
};

export const UNITES_BTP = [
  'm²', 'm³', 'ml', 'u', 'kg', 't', 'forfait', 'h', 'j', 'ens.',
] as const;

export const STATUS_LABELS: Record<DqeStatus, string> = {
  draft:     'Brouillon',
  soumise:   'En attente DG',
  validated: 'Validé',
  archived:  'Archivé',
};
