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
  budget_amount: string;
  start_date: string | null;
  end_date: string | null;
  members?: ProjectMember[];
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
