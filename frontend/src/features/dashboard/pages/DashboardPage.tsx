import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, type DashboardData } from '../api/get-dashboard';
import { useAuth } from '../../auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';
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
    breadcrumb: 'DIRECTION TRAVAUX · 2026',
    title: 'Portefeuille chantiers',
    subtitle: 'Vue consolidée des chantiers actifs, budgets et alertes terrain.',
  },
  terrain: {
    breadcrumb: 'TERRAIN · 2026',
    title: 'Mes chantiers',
    subtitle: 'Alertes actives, positions et accès rapide au journal du jour.',
  },
  gestion: {
    breadcrumb: 'GESTION FINANCIÈRE · 2026',
    title: 'Tableau de bord — Gestion',
    subtitle: 'Synthèse budgétaire et indicateurs financiers du portefeuille.',
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

function TerrainProjectList({ projects }: { projects: DashboardData['active_projects'] }) {
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const HEALTH_COLOR: Record<string, string> = { green: '#10b981', orange: '#f59e0b', red: '#ef4444' };

  return (
    <div className="card card--full" style={{ marginBottom: '1.5rem' }}>
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-content"><p>Chargement…</p></div>;
  if (!data) return <div className="page-content"><p className="form-error">Erreur de chargement.</p></div>;

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

      {roleGroup === 'terrain' && (
        <>
          <AlertsPanel alerts={alerts ?? []} />
          <TerrainProjectList projects={active_projects} />
          <MapCard projects={active_projects} />
        </>
      )}

      {roleGroup === 'gestion' && (
        <>
          <div className="db-top-row">
            <SynthesePortefeuille stats={stats} />
            <AlertsPanel alerts={alerts ?? []} />
            <IndicateursChantiers projects={active_projects} />
          </div>
          <DashboardCharts stats={stats} activeProjects={active_projects} />
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
