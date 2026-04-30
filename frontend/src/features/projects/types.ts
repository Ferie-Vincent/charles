export type Project = {
  id: number;
  code: string;
  name: string;
  status: string;
  location: string | null;
  budget_amount: string;
  start_date: string | null;
  end_date: string | null;
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
