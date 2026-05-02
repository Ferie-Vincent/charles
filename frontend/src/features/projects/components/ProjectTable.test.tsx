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
