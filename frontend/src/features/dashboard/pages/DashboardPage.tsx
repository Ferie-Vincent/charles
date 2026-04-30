import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, type DashboardData } from '../api/get-dashboard';
import PageHeader from '../../../components/ui/PageHeader';
import Card from '../../../components/ui/Card';
import DashboardCharts from '../components/DashboardCharts';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
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

function formatBudget(amount: number): string {
  if (amount >= 1_000_000_000)
    return (amount / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Mds FCFA';
  if (amount >= 1_000_000)
    return (amount / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M FCFA';
  return amount.toLocaleString('fr-FR') + ' FCFA';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

type DelayInfo = { label: string; css: string };

function getDelayInfo(endDate: string | null): DelayInfo {
  if (!endDate) return { label: '—', css: '' };
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  if (days < 0)   return { label: `${Math.abs(days)} j`,          css: 'badge badge-overdue' };
  if (days === 0) return { label: "Aujourd'hui",                  css: 'badge badge-urgent'  };
  if (days <= 30) return { label: `${days} j`,                   css: 'badge badge-urgent'  };
  if (days <= 90) return { label: `${days} j`,                   css: 'badge badge-soon'    };
  return           { label: `${days} j`,                         css: 'badge badge-ontrack' };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-content"><p>Chargement…</p></div>;
  if (!data) return <div className="page-content"><p className="form-error">Erreur de chargement.</p></div>;

  const { stats, active_projects, recent_activities } = data;

  return (
    <div>
      <PageHeader title="Portefeuille chantiers" />

      {/* ── KPI cards ── */}
      <div className="kpi-grid">
        <Card className="card--accent">
          <p className="kpi-label">Chantiers actifs</p>
          <p className="kpi-value">{stats.active_count}</p>
        </Card>
        <Card className="card--success">
          <p className="kpi-label">Budget actif engagé</p>
          <p className="kpi-value kpi-value--sm">{formatBudget(stats.budget_active)}</p>
        </Card>
        <Card className="card--info">
          <p className="kpi-label">Budget portefeuille total</p>
          <p className="kpi-value kpi-value--sm">{formatBudget(stats.budget_total)}</p>
        </Card>
        <Card className="card--muted">
          <p className="kpi-label">Terminés</p>
          <p className="kpi-value">{stats.completed_count}</p>
        </Card>
        <Card className="card--muted">
          <p className="kpi-label">En brouillon</p>
          <p className="kpi-value">{stats.draft_count}</p>
        </Card>
      </div>

      <DashboardCharts stats={stats} activeProjects={active_projects} />

      <div className="detail-grid" style={{ marginTop: 0 }}>

        {/* ── Chantiers actifs ── */}
        <div className="card card--half">
          <h3 className="card-title">Chantiers actifs — délais</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Chantier</th>
                <th>Budget</th>
                <th>Fin prévue</th>
                <th>Délai</th>
              </tr>
            </thead>
            <tbody>
              {active_projects.map(p => {
                const delay = getDelayInfo(p.end_date);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/projects/${p.id}`} className="row-link">{p.name}</Link>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.code}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatBudget(Number(p.budget_amount))}</td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 13 }}>
                      {p.end_date ? formatDate(p.end_date) : '—'}
                    </td>
                    <td>
                      {delay.css
                        ? <span className={delay.css}>{delay.label}</span>
                        : <span>{delay.label}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Activité récente ── */}
        <div className="card card--half">
          <h3 className="card-title">Activité récente</h3>
          <div className="timeline">
            {recent_activities.map(a => {
              const meta = ACTIVITY_META[a.type] ?? { label: a.type, css: 'badge-type-note' };
              return (
                <div key={a.id} className="timeline-item">
                  <div className="timeline-body">
                    <div className="timeline-header">
                      <span className={`badge ${meta.css}`}>{meta.label}</span>
                      <Link to={`/projects/${a.project.id}`} className="timeline-project-link">
                        {a.project.code}
                      </Link>
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

      </div>
    </div>
  );
}
