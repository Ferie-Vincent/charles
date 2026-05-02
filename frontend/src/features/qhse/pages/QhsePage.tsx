import SkeletonPage from '../../../components/ui/SkeletonPage';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../../components/ui/PageHeader';
import { getPortfolioQhse } from '../api/get-portfolio-qhse';
import type { QhseIncident, SafetyByProject } from '../api/get-portfolio-qhse';

// ─── Grade colours ───────────────────────────────────────────
const GRADE_COLOR: Record<string, string> = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#f59e0b',
  D: '#ef4444',
};

// ─── Severity badge styles ────────────────────────────────────
const SEVERITY_STYLE: Record<string, { background: string; color: string }> = {
  mineur:   { background: '#dbeafe', color: '#1e40af' },
  majeur:   { background: '#fed7aa', color: '#9a3412' },
  critique: { background: '#fee2e2', color: '#991b1b' },
};

const SEVERITY_LABEL: Record<string, string> = {
  mineur:   'Mineur',
  majeur:   'Majeur',
  critique: 'Critique',
};

// ─── Status badge styles ──────────────────────────────────────
const STATUS_STYLE: Record<string, { background: string; color: string }> = {
  ouvert:   { background: '#fee2e2', color: '#991b1b' },
  en_cours: { background: '#fed7aa', color: '#9a3412' },
  resolu:   { background: '#dcfce7', color: '#166534' },
  ferme:    { background: '#f1f5f9', color: '#64748b' },
};

const STATUS_LABEL: Record<string, string> = {
  ouvert:   'Ouvert',
  en_cours: 'En cours',
  resolu:   'Résolu',
  ferme:    'Fermé',
};

type Filter = 'all' | 'open' | 'critique';

function truncate(str: string, max: number): string {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Safety Score Card ────────────────────────────────────────
function SafetyCard({ item }: { item: SafetyByProject }) {
  const gradeColor = GRADE_COLOR[item.grade] ?? '#64748b';
  return (
    <div className="qh-safety-card">
      <div
        className="qh-safety-card__grade"
        style={{ background: gradeColor + '22', color: gradeColor, borderColor: gradeColor + '44' }}
      >
        {item.grade}
      </div>
      <div className="qh-safety-card__body">
        <div className="qh-safety-card__name">{item.project_name}</div>
        <div className="qh-safety-card__code">{item.project_code}</div>
        <div className="qh-safety-card__score" style={{ color: gradeColor }}>
          {item.score}/100
        </div>
        <div className="qh-safety-card__counts">
          {item.mineur > 0 && (
            <span className="qh-badge" style={SEVERITY_STYLE.mineur}>
              {item.mineur} min.
            </span>
          )}
          {item.majeur > 0 && (
            <span className="qh-badge" style={SEVERITY_STYLE.majeur}>
              {item.majeur} maj.
            </span>
          )}
          {item.critique > 0 && (
            <span className="qh-badge" style={SEVERITY_STYLE.critique}>
              {item.critique} crit.
            </span>
          )}
          {item.mineur === 0 && item.majeur === 0 && item.critique === 0 && (
            <span className="qh-safety-card__clean">Aucun incident</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Incident Row ─────────────────────────────────────────────
function IncidentRow({ inc }: { inc: QhseIncident }) {
  const sevStyle    = SEVERITY_STYLE[inc.severity]    ?? { background: '#f1f5f9', color: '#64748b' };
  const statusStyle = STATUS_STYLE[inc.status]        ?? { background: '#f1f5f9', color: '#64748b' };

  return (
    <tr>
      <td>
        <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>{inc.project_name}</span>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{inc.project_code}</p>
      </td>
      <td>{inc.type}</td>
      <td>
        <span className="badge" style={{ background: sevStyle.background, color: sevStyle.color, borderColor: sevStyle.color + '35' }}>
          {SEVERITY_LABEL[inc.severity] ?? inc.severity}
        </span>
      </td>
      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        {truncate(inc.description, 60)}
      </td>
      <td>
        <span className="badge" style={{ background: statusStyle.background, color: statusStyle.color, borderColor: statusStyle.color + '35' }}>
          {STATUS_LABEL[inc.status] ?? inc.status}
        </span>
      </td>
      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        {formatDate(inc.occurred_at)}
      </td>
      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{inc.reporter_name}</td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function QhsePage() {
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio-qhse'],
    queryFn: getPortfolioQhse,
  });

  const filteredIncidents = (data?.incidents ?? []).filter((inc) => {
    if (filter === 'open')     return inc.status === 'ouvert' || inc.status === 'en_cours';
    if (filter === 'critique') return inc.severity === 'critique';
    return true;
  });

  return (
    <div className="qh-page">
      <PageHeader
        title="Suivi QHSE"
        subtitle="Qualité · Hygiène · Sécurité · Environnement — vue portefeuille"
      />

      {/* ── KPI Row ── */}
      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{isLoading ? '…' : (data?.stats.total_incidents ?? 0)}</div>
            <div className="proj-kpi__label">Total incidents</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div
              className="proj-kpi__value"
              style={{ color: (data?.stats.open_incidents ?? 0) > 0 ? '#f59e0b' : undefined }}
            >
              {isLoading ? '…' : (data?.stats.open_incidents ?? 0)}
            </div>
            <div className="proj-kpi__label">Incidents ouverts</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--red">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div
              className="proj-kpi__value"
              style={{ color: (data?.stats.critique_count ?? 0) > 0 ? '#ef4444' : undefined }}
            >
              {isLoading ? '…' : (data?.stats.critique_count ?? 0)}
            </div>
            <div className="proj-kpi__label">Critiques</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div
              className="proj-kpi__value"
              style={{
                color: data
                  ? data.stats.avg_safety_score >= 90
                    ? '#22c55e'
                    : data.stats.avg_safety_score >= 70
                    ? '#84cc16'
                    : data.stats.avg_safety_score >= 50
                    ? '#f59e0b'
                    : '#ef4444'
                  : undefined,
              }}
            >
              {isLoading ? '…' : `${data?.stats.avg_safety_score ?? 100}/100`}
            </div>
            <div className="proj-kpi__label">Score sécurité moyen</div>
          </div>
        </div>
      </div>

      {/* ── Safety Scores Grid ── */}
      <section className="qh-section">
        <h2 className="qh-section__title">Score sécurité par chantier (mois en cours)</h2>

        {isLoading && (
          <div className="skeleton skeleton-page__card" style={{ height: 120 }} />
        )}

        {isError && (
          <div className="qh-error">Impossible de charger les données QHSE.</div>
        )}

        {!isLoading && !isError && data && (
          <>
            {data.safety_by_project.length === 0 ? (
              <div className="qh-empty">Aucun chantier actif.</div>
            ) : (
              <div className="qh-safety-grid">
                {data.safety_by_project.map((item) => (
                  <SafetyCard key={item.project_id} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Incidents Table ── */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Toolbar row */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-body)', marginRight: 8 }}>Incidents récents</span>
          {(['all', 'open', 'critique'] as Filter[]).map((f) => {
            const count = f === 'all'
              ? (data?.incidents ?? []).length
              : f === 'open'
              ? (data?.incidents ?? []).filter(inc => inc.status === 'ouvert' || inc.status === 'en_cours').length
              : (data?.incidents ?? []).filter(inc => inc.severity === 'critique').length;
            return (
              <button
                key={f}
                className={`bud-tab${filter === f ? ' bud-tab--active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : 'Critiques'}
                <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, background: filter === f ? 'rgba(255,255,255,0.2)' : 'var(--border)', color: filter === f ? 'inherit' : 'var(--text-muted)', borderRadius: 4, padding: '1px 5px' }}>{count}</span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="skeleton skeleton-page__card" style={{ height: 80, margin: 16 }} />
        ) : isError ? (
          <p style={{ padding: '2rem', color: 'var(--text-muted)', textAlign: 'center' }}>Impossible de charger les données QHSE.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Chantier</th>
                <th>Type</th>
                <th>Sévérité</th>
                <th>Description</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {filter === 'all'
                      ? 'Aucun incident enregistré.'
                      : filter === 'open'
                      ? 'Aucun incident ouvert.'
                      : 'Aucun incident critique.'}
                  </td>
                </tr>
              )}
              {filteredIncidents.map((inc) => (
                <IncidentRow key={inc.id} inc={inc} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
