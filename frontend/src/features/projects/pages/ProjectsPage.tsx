import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { listProjects } from '../api/list-projects';
import type { Project } from '../types';
import ProjectCard from '../components/ProjectCard';
import ProjectTable from '../components/ProjectTable';
import PageHeader from '../../../components/ui/PageHeader';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';

const STATUSES = [
  { key: '',          label: 'Tous' },
  { key: 'active',    label: 'Actifs' },
  { key: 'draft',     label: 'Brouillon' },
  { key: 'completed', label: 'Terminés' },
  { key: 'archived',  label: 'Archivés' },
];

export default function ProjectsPage() {
  const { user } = useAuth();
  const canCreate = getRoleGroup(user?.role?.name ?? '') === 'direction';

  const [searchParams, setSearchParams] = useSearchParams();
  const q      = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';

  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState(q);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: listProjects,
    staleTime: 60_000,
  });

  const filtered = projects.filter(p => {
    const matchQ = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.location ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !status || p.status === status;
    return matchQ && matchStatus;
  });

  const total     = projects.length;
  const actifs    = projects.filter(p => p.status === 'active').length;
  const termines  = projects.filter(p => p.status === 'completed').length;
  const budgetTotal = projects.reduce((sum, p) => sum + Number(p.budget_amount), 0);

  function setStatus(s: string) {
    const next = new URLSearchParams(searchParams);
    if (s) next.set('status', s); else next.delete('status');
    setSearchParams(next);
  }

  function handleSearch(val: string) {
    setSearch(val);
    const next = new URLSearchParams(searchParams);
    if (val.trim()) next.set('q', val.trim()); else next.delete('q');
    setSearchParams(next);
  }

  return (
    <div>
      <PageHeader
        title="Chantiers"
        subtitle={`${total} chantier${total !== 1 ? 's' : ''} dans le portefeuille`}
        action={
          canCreate && (
            <Link to="/projects/new" className="btn btn--primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nouveau chantier
            </Link>
          )
        }
      />

      <div className="page-content">

        {/* KPI strip */}
        <div className="proj-kpi-row">
          <div className="proj-kpi">
            <div className="proj-kpi__icon proj-kpi__icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div className="proj-kpi__body">
              <div className="proj-kpi__value">{total}</div>
              <div className="proj-kpi__label">Total chantiers</div>
            </div>
          </div>

          <div className="proj-kpi">
            <div className="proj-kpi__icon proj-kpi__icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div className="proj-kpi__body">
              <div className="proj-kpi__value">{actifs}</div>
              <div className="proj-kpi__label">En cours</div>
            </div>
          </div>

          <div className="proj-kpi">
            <div className="proj-kpi__icon proj-kpi__icon--orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div className="proj-kpi__body">
              <div className="proj-kpi__value">{budgetTotal > 0 ? (budgetTotal / 1_000_000).toFixed(1) + 'M' : '—'}</div>
              <div className="proj-kpi__label">Budget total (FCFA)</div>
            </div>
          </div>

          <div className="proj-kpi">
            <div className="proj-kpi__icon proj-kpi__icon--teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="proj-kpi__body">
              <div className="proj-kpi__value">{termines}</div>
              <div className="proj-kpi__label">Terminés</div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="projects-filter-bar">
          <div className="filter-pills">
            {STATUSES.map(s => (
              <button
                key={s.key}
                type="button"
                className={`filter-pill${status === s.key ? ' filter-pill--active' : ''}`}
                onClick={() => setStatus(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="filter-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher un chantier…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                aria-label="Effacer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          <div className="view-toggle">
            <button
              type="button"
              className={`view-toggle__btn${view === 'cards' ? ' view-toggle__btn--active' : ''}`}
              onClick={() => setView('cards')}
              aria-label="Vue cartes"
              title="Vue cartes"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
            <button
              type="button"
              className={`view-toggle__btn${view === 'table' ? ' view-toggle__btn--active' : ''}`}
              onClick={() => setView('table')}
              aria-label="Vue liste"
              title="Vue liste"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <SkeletonPage rows={2} />
        ) : view === 'cards' ? (
          <div className="projects-grid">
            {filtered.length === 0 ? (
              <div className="projects-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
                {search || status
                  ? <span>Aucun chantier ne correspond aux filtres.</span>
                  : <span>Aucun chantier. <Link to="/projects/new">Créer le premier.</Link></span>
                }
              </div>
            ) : (
              filtered.map(p => <ProjectCard key={p.id} p={p} />)
            )}
          </div>
        ) : (
          <ProjectTable projects={filtered} />
        )}

      </div>
    </div>
  );
}
