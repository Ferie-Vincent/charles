export type ProjectActivity = {
  id: number;
  type: string;
  description: string;
  created_at: string;
  user: { id: number; name: string } | null;
};

export type ProjectMember = {
  id: number;
  user_id: number;
  assignment_role: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: { name: string; label: string };
  };
};

export type TypeMarche     = 'forfait' | 'bordereau_prix' | 'depenses_controlees' | 'cle_en_main';
export type LifecycleStatus = 'ao' | 'attribution' | 'preparation' | 'execution' | 'reception' | 'cloture';

export type Project = {
  id: number;
  code: string;
  name: string;
  status: string;
  lifecycle_status?: LifecycleStatus | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  budget_amount: string;
  start_date: string | null;
  end_date: string | null;
  target_progress: number | null;
  // BTP contract fields
  type_marche: TypeMarche | null;
  maitre_ouvrage: string | null;
  maitre_oeuvre: string | null;
  bureau_controle: string | null;
  montant_marche: number | null;
  avance_demarrage_pct: number | null;
  delai_execution_jours: number | null;
  date_reception_provisoire: string | null;
  date_reception_definitive: string | null;
  caution_bonne_execution_pct: number | null;
  caution_liberee: boolean;
  caution_liberee_at: string | null;
  is_arrete: boolean;
  arret_depuis: string | null;
  penalites_retard_par_jour: number | null;
  members?: ProjectMember[];
  activities?: ProjectActivity[];
};

export type CreateProjectPayload = {
  code: string;
  name: string;
  status: string;
  location?: string;
  budget_amount?: number;
  start_date?: string;
  end_date?: string;
  // BTP contract fields
  type_marche?: TypeMarche;
  maitre_ouvrage?: string;
  maitre_oeuvre?: string;
  bureau_controle?: string;
  montant_marche?: number;
  avance_demarrage_pct?: number;
  delai_execution_jours?: number;
  date_reception_provisoire?: string;
  date_reception_definitive?: string;
  latitude?: number;
  longitude?: number;
};
