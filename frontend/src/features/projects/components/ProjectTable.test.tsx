import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProjectTable from './ProjectTable';

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ProjectTable', () => {
  it('renders project rows', () => {
    wrap(
      <ProjectTable
        projects={[
          {
            id: 1,
            code: 'CH-001',
            name: 'Villa Angre',
            status: 'active',
            location: 'Abidjan',
            budget_amount: '85000000.00',
            start_date: null,
            end_date: null,
            latitude: null,
            longitude: null,
            target_progress: null,
            type_marche: null,
            maitre_ouvrage: null,
            maitre_oeuvre: null,
            bureau_controle: null,
            montant_marche: null,
            avance_demarrage_pct: 0,
            delai_execution_jours: null,
            date_reception_provisoire: null,
            date_reception_definitive: null,
            caution_bonne_execution_pct: null,
            caution_liberee: false,
            caution_liberee_at: null,
            penalites_retard_par_jour: null,
          },
        ]}
      />,
    );

    expect(screen.getByText('Villa Angre')).toBeInTheDocument();
    expect(screen.getByText('CH-001')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });

  it('shows empty state when no projects', () => {
    wrap(<ProjectTable projects={[]} />);
    expect(screen.getByText(/Aucun chantier/)).toBeInTheDocument();
  });
});
