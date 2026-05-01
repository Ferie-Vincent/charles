export type DailyLog = {
  id: number;
  project_id: number;
  user_id: number;
  log_date: string;
  weather: Weather;
  workers_count: number;
  progress_percent: number;
  has_incident: boolean;
  incident_type: IncidentType | null;
  equipment_status: EquipmentStatus | null;
  materials_received: MaterialItem[] | null;
  notes: string | null;
  created_at: string;
};

export type MaterialItem = {
  name: string;
  quantity: number;
  unit?: string;
};

export type Weather = 'Soleil' | 'Nuageux' | 'Pluie' | 'Orage' | 'Vent fort' | 'Autre';
export type IncidentType = 'Retard' | 'Accident' | 'Litige' | 'Rupture stock' | 'Panne' | 'RAS' | 'Autre';
export type EquipmentStatus = 'Bon' | 'Moyen' | 'Mauvais' | 'Hors service';

export type CreateDailyLogPayload = {
  weather: Weather;
  workers_count: number;
  progress_percent: number;
  has_incident?: boolean;
  incident_type?: IncidentType;
  equipment_status?: EquipmentStatus;
  materials_received?: MaterialItem[];
  notes?: string;
};
