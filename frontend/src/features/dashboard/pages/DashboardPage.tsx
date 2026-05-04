import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboard, type DashboardData } from '../api/get-dashboard';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup, type RoleGroup } from '../../../lib/roles';
import PageHeader from '../../../components/ui/PageHeader';
import KpiBar from '../components/KpiBar';
import SynthesePortefeuille from '../components/SynthesePortefeuille';
import IndicateursChantiers from '../components/IndicateursChantiers';
import DashboardCharts from '../components/DashboardCharts';
import MapView from '../components/MapView';
import TimelineView from '../components/TimelineView';
import AlertsPanel from '../components/AlertsPanel';
import AiAnalysisWidget from '../components/AiAnalysisWidget';

const ROLE_HEADER: Record<RoleGroup, { breadcrumb: string; title: string; subtitle: string }> = {
  direction: {
    breadcrumb: 'DIRECTION GÉNÉRALE · 2026',
    title: 'Portefeuille chantiers',
    subtitle: 'Vue consolidée des chantiers actifs, budgets et alertes terrain.',
  },
  dt: {
    breadcrumb: 'DIRECTION TECHNIQUE · 2026',
    title: 'Tableau de bord — DT',
    subtitle: 'Vue opérationnelle : DQE, achats, avancements et alertes chantier.',
  },
  terrain: {
    breadcrumb: 'TERRAIN · 2026',
    title: 'Mes chantiers',
    subtitle: 'Alertes actives, positions et accès rapide au journal du jour.',
  },
  metreur: {
    breadcrumb: 'MÉTREUR-ÉCONOMISTE · 2026',
    title: 'Tableau de bord — Métreur',
    subtitle: 'Synthèse DQE, avancements et indicateurs chantiers.',
  },
  comptable: {
    breadcrumb: 'COMPTABILITÉ · 2026',
    title: 'Tableau de bord — Comptabilité',
    subtitle: 'Synthèse budgétaire, factures et indicateurs financiers.',
  },
  logistique: {
    breadcrumb: 'LOGISTIQUE · 2026',
    title: 'Tableau de bord — Logistique',
    subtitle: 'Achats, stocks et demandes de matériaux en cours.',
  },
  lecture: {
    breadcrumb: 'LECTURE SEULE · 2026',
    title: 'Tableau de bord',
    subtitle: 'Vue en lecture du portefeuille chantiers.',
  },
};

const ACTIVITY_META: Record<string, { label: string; css: string }> = {
  status_change:  { label: 'Statut',   css: 'badge-type-status' },
  member_added:   { label: 'Équipe',   css: 'badge-type-team'   },
  member_removed: { label: 'Équipe',   css: 'badge-type-team'   },
  budget_update:  { label: 'Budget',   css: 'badge-type-budget' },
  site_visit:     { label: 'Visite',   css: 'badge-type-visit'  },
  note:           { label: 'Note',     css: 'badge-type-note'   },
  document:       { label: 'Document', css: 'badge-type-doc'    },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ActivityFeed({ activities }: { activities: DashboardData['recent_activities'] }) {
  return (
    <div className="card card--full" style={{ marginTop: 0 }}>
      <div className="card-head">
        <div className="card-icon card-icon--purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div><h3 className="card-title" style={{ margin: 0 }}>Activité récente</h3></div>
      </div>
      <div className="timeline">
        {activities.map(a => {
          const meta = ACTIVITY_META[a.type] ?? { label: a.type, css: 'badge-type-note' };
          return (
            <div key={a.id} className="timeline-item">
              <div className="timeline-body">
                <div className="timeline-header">
                  <span className={`badge ${meta.css}`}>{meta.label}</span>
                  <Link to={`/projects/${a.project.id}`} className="timeline-project-link">{a.project.code}</Link>
                  <span className="timeline-date">{formatDate(a.created_at)}</span>
                </div>
                <p className="timeline-description">{a.description}</p>
                {a.user && <span className="timeline-author">— {a.user.name}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineCard({ projects }: { projects: DashboardData['active_projects'] }) {
  return (
    <div className="card card--full" style={{ marginTop: '1.5rem' }}>
      <div className="card-head">
        <div className="card-icon card-icon--gray">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Vue chronologique — dates de fin</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>Tous les chantiers actifs triés par échéance</p>
        </div>
      </div>
      <TimelineView projects={projects} />
    </div>
  );
}

function MapCard({ projects }: { projects: DashboardData['active_projects'] }) {
  return (
    <div className="card card--full" style={{ marginBottom: '1.5rem' }}>
      <div className="card-head">
        <div className="card-icon card-icon--teal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </div>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Carte des chantiers actifs</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>Health score · Cliquer un marqueur pour ouvrir le chantier</p>
        </div>
      </div>
      <MapView projects={projects} />
    </div>
  );
}

function LogiProjectList({ projects }: { projects: DashboardData['active_projects'] }) {
  const HEALTH_COLOR: Record<string, string> = { green: '#10b981', orange: '#f59e0b', red: '#ef4444' };

  return (
    <div className="card card--full" style={{ margin: 0 }}>
      <div className="card-head">
        <div className="card-icon card-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Chantiers actifs</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>Sites à approvisionner</p>
        </div>
      </div>
      <div className="terrain-project-list">
        {projects.map(p => (
          <div key={p.id} className="terrain-project-row">
            <div className="terrain-project-row__info">
              <span className="terrain-project-row__code" style={{ borderColor: HEALTH_COLOR[p.health.status] ?? '#94a3b8' }}>
                {p.code}
              </span>
              <span className="terrain-project-row__name">{p.name}</span>
            </div>
            <Link to={`/projects/${p.id}`} className="terrain-project-row__cta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Voir chantier
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions({ links }: { links: { label: string; sub: string; to: string; icon: JSX.Element }[] }) {
  return (
    <div className="db-quick-actions">
      {links.map(l => (
        <Link key={l.to} to={l.to} className="db-quick-action-card">
          <span className="db-quick-action-card__icon">{l.icon}</span>
          <span className="db-quick-action-card__label">{l.label}</span>
          <span className="db-quick-action-card__sub">{l.sub}</span>
        </Link>
      ))}
    </div>
  );
}

function TerrainProjectList({ projects }: { projects: DashboardData['active_projects'] }) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const HEALTH_COLOR: Record<string, string> = { green: '#10b981', orange: '#f59e0b', red: '#ef4444' };

  return (
    <div className="card card--full" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
      <div className="card-head">
        <div className="card-icon card-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Chantiers actifs</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>Journal du jour — {today}</p>
        </div>
      </div>
      <div className="terrain-project-list">
        {projects.map(p => (
          <div key={p.id} className="terrain-project-row">
            <div className="terrain-project-row__info">
              <span className="terrain-project-row__code" style={{ borderColor: HEALTH_COLOR[p.health.status] ?? '#94a3b8' }}>
                {p.code}
              </span>
              <span className="terrain-project-row__name">{p.name}</span>
            </div>
            <div className="terrain-project-row__actions">
              <span className="terrain-project-row__score" style={{ color: HEALTH_COLOR[p.health.status] ?? '#94a3b8' }}>
                {p.health.score}/100
              </span>
              <Link to={`/projects/${p.id}/journal`} className="terrain-project-row__cta">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Saisir journal
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    staleTime: 60_000,
  });

  if (isLoading) return <div className="page-content"><SkeletonPage rows={4} /></div>;
  if (isError || !data) return <div className="page-content"><p className="form-error">Erreur de chargement.</p></div>;

  const { stats, active_projects, recent_activities, alerts } = data;
  const roleGroup = getRoleGroup(user?.role?.name ?? '');
  const header = ROLE_HEADER[roleGroup];

  return (
    <div>
      <PageHeader
        breadcrumb={header.breadcrumb}
        title={header.title}
        subtitle={header.subtitle}
        syncLabel="Données synchronisées · il y a 2 min"
      />

      <KpiBar stats={stats} />

      {roleGroup === 'direction' && (
        <>
          <AiAnalysisWidget />
          <div className="db-top-row">
            <SynthesePortefeuille stats={stats} />
            <AlertsPanel alerts={alerts ?? []} />
            <IndicateursChantiers projects={active_projects} />
          </div>
          <DashboardCharts stats={stats} activeProjects={active_projects} />
          <MapCard projects={active_projects} />
          <ActivityFeed activities={recent_activities} />
          <TimelineCard projects={active_projects} />
        </>
      )}

      {roleGroup === 'dt' && (
        <>
          <div className="db-top-row">
            <SynthesePortefeuille stats={stats} />
            <AlertsPanel alerts={alerts ?? []} />
            <IndicateursChantiers projects={active_projects} />
          </div>
          <DashboardCharts stats={stats} activeProjects={active_projects} />
          <MapCard projects={active_projects} />
          <ActivityFeed activities={recent_activities} />
          <TimelineCard projects={active_projects} />
        </>
      )}

      {roleGroup === 'terrain' && (
        <>
          <AlertsPanel alerts={alerts ?? []} />
          <TerrainProjectList projects={active_projects} />
          <MapCard projects={active_projects} />
        </>
      )}

      {roleGroup === 'metreur' && (
        <>
          <div className="db-top-row">
            <SynthesePortefeuille stats={stats} />
            <AlertsPanel alerts={alerts ?? []} />
            <IndicateursChantiers projects={active_projects} />
          </div>
          <QuickActions links={[
            { label: 'DQE Portefeuille', sub: 'Versions & lots', to: '/portfolio/dqe', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
            { label: 'Achats / BDC', sub: 'Commandes en cours', to: '/achats', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
            { label: 'Chantiers', sub: 'Voir tous les projets', to: '/projects', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
          ]} />
          <DashboardCharts stats={stats} activeProjects={active_projects} />
          <ActivityFeed activities={recent_activities} />
        </>
      )}

      {roleGroup === 'comptable' && (
        <>
          <div className="db-top-row">
            <SynthesePortefeuille stats={stats} />
            <AlertsPanel alerts={alerts ?? []} />
          </div>
          <QuickActions links={[
            { label: 'Comptabilité', sub: 'Factures & fournisseurs', to: '/accounting', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
            { label: 'Demandes besoin', sub: 'À comptabiliser', to: '/achats', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
            { label: 'Dépenses générales', sub: 'Charges & frais', to: '/accounting', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
          ]} />
          <ActivityFeed activities={recent_activities} />
        </>
      )}

      {roleGroup === 'logistique' && (
        <>
          <div className="db-top-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
            <AlertsPanel alerts={alerts ?? []} />
            <LogiProjectList projects={active_projects} />
          </div>
          <QuickActions links={[
            { label: 'Bons de commande', sub: 'Préparer & réceptionner', to: '/achats', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
            { label: 'Stocks', sub: 'Niveaux & mouvements', to: '/stocks', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
            { label: 'Demandes besoin', sub: 'À préparer & livrer', to: '/besoins', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
            { label: 'Fournisseurs', sub: 'Annuaire & contacts', to: '/suppliers', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          ]} />
          <ActivityFeed activities={recent_activities} />
        </>
      )}

      {roleGroup === 'lecture' && (
        <>
          <div className="db-top-row">
            <SynthesePortefeuille stats={stats} />
            <IndicateursChantiers projects={active_projects} />
          </div>
          <DashboardCharts stats={stats} activeProjects={active_projects} />
        </>
      )}
    </div>
  );
}
