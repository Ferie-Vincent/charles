import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, type DashboardData } from '../api/get-dashboard';
import PageHeader from '../../../components/ui/PageHeader';
import Card from '../../../components/ui/Card';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
};

const ACTIVITY_LABELS: Record<string, string> = {
  status_change:  'Statut',
  member_added:   'Équipe',
  member_removed: 'Équipe',
  budget_update:  'Budget',
  site_visit:     'Visite',
  note:           'Note',
};

function formatBudget(amount: number): string {
  if (amount >= 1_000_000_000) {
    return (amount / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' Mds FCFA';
  }
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' M FCFA';
  }
  return amount.toLocaleString('fr-FR') + ' FCFA';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLeft(endDate: string | null): string {
  if (!endDate) return '—';
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return `${Math.abs(diff)} j dépassé`;
  if (diff === 0) return 'Aujourd\'hui';
  return `${diff} j`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-content"><p>Chargement…</p></div>;
  if (!data) return <div className="page-content"><p className="form-error">Erreur de chargement.</p></div>;

  const { stats, active_projects, recent_activities } = data;

  return (
    <div>
      <PageHeader title="Portefeuille chantiers" />

      {/* ── KPI cards ── */}
      <div className="kpi-grid">
        <Card>
          <p className="kpi-label">Chantiers actifs</p>
          <p className="kpi-value">{stats.active_count}</p>
        </Card>
        <Card>
          <p className="kpi-label">Budget actif engagé</p>
          <p className="kpi-value kpi-value--sm">{formatBudget(stats.budget_active)}</p>
        </Card>
        <Card>
          <p className="kpi-label">Budget portefeuille total</p>
          <p className="kpi-value kpi-value--sm">{formatBudget(stats.budget_total)}</p>
        </Card>
        <Card>
          <p className="kpi-label">Terminés</p>
          <p className="kpi-value">{stats.completed_count}</p>
        </Card>
        <Card>
          <p className="kpi-label">En brouillon</p>
          <p className="kpi-value">{stats.draft_count}</p>
        </Card>
      </div>

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
              {active_projects.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/projects/${p.id}`} className="row-link">{p.name}</Link>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.code}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatBudget(Number(p.budget_amount))}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{p.end_date ? formatDate(p.end_date) : '—'}</td>
                  <td>
                    <span className={Number(daysLeft(p.end_date).replace(' j', '')) < 60 ? 'badge badge-active' : ''}>
                      {daysLeft(p.end_date)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Activité récente ── */}
        <div className="card card--half">
          <h3 className="card-title">Activité récente (toutes chantiers)</h3>
          <div className="timeline">
            {recent_activities.map(a => (
              <div key={a.id} className="timeline-item">
                <div className="timeline-body">
                  <div className="timeline-header">
                    <span className="timeline-label">{ACTIVITY_LABELS[a.type] ?? a.type}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      <Link to={`/projects/${a.project.id}`} className="row-link">{a.project.code}</Link>
                    </span>
                    <span className="timeline-date">{formatDate(a.created_at)}</span>
                  </div>
                  <p className="timeline-description">{a.description}</p>
                  {a.user && <span className="timeline-author">— {a.user.name}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
