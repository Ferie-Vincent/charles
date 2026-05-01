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

export type Project = {
  id: number;
  code: string;
  name: string;
  status: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  budget_amount: string;
  start_date: string | null;
  end_date: string | null;
  target_progress: number | null;
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
};
