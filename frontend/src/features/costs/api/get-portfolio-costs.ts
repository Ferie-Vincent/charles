import { api } from '../../../lib/api';

export type ProjectCost = {
  id: number;
  name: string;
  code: string;
  status: string;
  budget_amount: number;
  previsionnel: number;
  engagement: number;
  paiement: number;
  solde: number;
  taux_engagement: number;
  taux_paiement: number;
};

export type PortfolioCosts = {
  totals: {
    previsionnel: number;
    engagement: number;
    paiement: number;
    solde: number;
    taux_engagement: number;
    taux_paiement: number;
  };
  projects: ProjectCost[];
};

export async function getPortfolioCosts(): Promise<PortfolioCosts> {
  const { data } = await api.get<PortfolioCosts>('/portfolio/costs');
  return data;
}
