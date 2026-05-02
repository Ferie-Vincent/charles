import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { listProjects } from '../api/list-projects';
import type { Project } from '../types';
import ProjectTable from '../components/ProjectTable';
import PageHeader from '../../../components/ui/PageHeader';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';

export default function ProjectsPage() {
  const { user } = useAuth();
  const canCreate = getRoleGroup(user?.role?.name ?? '') === 'direction';
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: listProjects,
    staleTime: 60_000,
  });

  const filtered = q.trim()
    ? projects.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.code.toLowerCase().includes(q.toLowerCase()) ||
        (p.location ?? '').toLowerCase().includes(q.toLowerCase())
      )
    : projects;

  return (
    <div>
      <PageHeader
        title={q ? `Résultats pour "${q}"` : 'Chantiers'}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {q && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSearchParams({})}
                style={{ fontSize: '0.82rem' }}
              >
                ✕ Effacer recherche
              </button>
            )}
            {canCreate && (
              <Link to="/projects/new" className="btn-primary">+ Nouveau chantier</Link>
            )}
          </div>
        }
      />
      {isLoading ? (
        <SkeletonPage rows={2} />
      ) : filtered.length === 0 && q ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Aucun chantier ne correspond à <strong>"{q}"</strong>
        </div>
      ) : (
        <ProjectTable projects={filtered} />
      )}
    </div>
  );
}
