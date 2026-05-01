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

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="qh-kpi-card">
      <span className="qh-kpi-card__value" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
      <span className="qh-kpi-card__label">{label}</span>
    </div>
  );
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
    <tr className="qh-table__row">
      <td className="qh-table__cell">
        <div className="qh-table__project-name">{inc.project_name}</div>
        <div className="qh-table__project-code">{inc.project_code}</div>
      </td>
      <td className="qh-table__cell">{inc.type}</td>
      <td className="qh-table__cell">
        <span className="qh-badge" style={sevStyle}>
          {SEVERITY_LABEL[inc.severity] ?? inc.severity}
        </span>
      </td>
      <td className="qh-table__cell qh-table__cell--desc">
        {truncate(inc.description, 60)}
      </td>
      <td className="qh-table__cell">
        <span className="qh-badge" style={statusStyle}>
          {STATUS_LABEL[inc.status] ?? inc.status}
        </span>
      </td>
      <td className="qh-table__cell qh-table__cell--date">
        {formatDate(inc.occurred_at)}
      </td>
      <td className="qh-table__cell">{inc.reporter_name}</td>
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

      {/* ── KPI Bar ── */}
      <div className="qh-kpi-bar">
        <KpiCard
          label="Total incidents"
          value={isLoading ? '…' : (data?.stats.total_incidents ?? 0)}
        />
        <KpiCard
          label="Incidents ouverts"
          value={isLoading ? '…' : (data?.stats.open_incidents ?? 0)}
          accent={data && data.stats.open_incidents > 0 ? '#f59e0b' : undefined}
        />
        <KpiCard
          label="Critiques"
          value={isLoading ? '…' : (data?.stats.critique_count ?? 0)}
          accent={data && data.stats.critique_count > 0 ? '#ef4444' : undefined}
        />
        <KpiCard
          label="Score sécurité moyen"
          value={isLoading ? '…' : `${data?.stats.avg_safety_score ?? 100}/100`}
          accent={
            data
              ? data.stats.avg_safety_score >= 90
                ? '#22c55e'
                : data.stats.avg_safety_score >= 70
                ? '#84cc16'
                : data.stats.avg_safety_score >= 50
                ? '#f59e0b'
                : '#ef4444'
              : undefined
          }
        />
      </div>

      {/* ── Safety Scores Grid ── */}
      <section className="qh-section">
        <h2 className="qh-section__title">Score sécurité par chantier (mois en cours)</h2>

        {isLoading && (
          <div className="qh-loading">Chargement…</div>
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
      <section className="qh-section">
        <div className="qh-section__head">
          <h2 className="qh-section__title">Incidents récents</h2>
          <div className="qh-filters">
            {(['all', 'open', 'critique'] as Filter[]).map((f) => (
              <button
                key={f}
                className={`qh-filter-btn${filter === f ? ' qh-filter-btn--active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Tous' : f === 'open' ? 'Ouverts' : 'Critiques'}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <div className="qh-loading">Chargement…</div>}

        {!isLoading && !isError && data && (
          <>
            {filteredIncidents.length === 0 ? (
              <div className="qh-empty">
                {filter === 'all'
                  ? 'Aucun incident enregistré.'
                  : filter === 'open'
                  ? 'Aucun incident ouvert.'
                  : 'Aucun incident critique.'}
              </div>
            ) : (
              <div className="qh-table-wrap">
                <table className="qh-table">
                  <thead>
                    <tr>
                      <th className="qh-table__th">Chantier</th>
                      <th className="qh-table__th">Type</th>
                      <th className="qh-table__th">Sévérité</th>
                      <th className="qh-table__th">Description</th>
                      <th className="qh-table__th">Statut</th>
                      <th className="qh-table__th">Date</th>
                      <th className="qh-table__th">Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.map((inc) => (
                      <IncidentRow key={inc.id} inc={inc} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
