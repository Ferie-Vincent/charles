import { useQuery } from '@tanstack/react-query';
import { getEvaluation, type ProjectEvaluation } from '../api/get-evaluation';
import PageHeader from '../../../components/ui/PageHeader';

const HEALTH_COLOR: Record<string, string> = {
  good:     'var(--color-success)',
  warning:  'var(--color-warning)',
  critical: 'var(--color-danger)',
};

const HEALTH_BG: Record<string, string> = {
  good:     'var(--color-success-light, #d1fae5)',
  warning:  'var(--color-warning-light, #fef3c7)',
  critical: 'var(--color-danger-light, #fee2e2)',
};

const STATUS_LABEL: Record<string, string> = {
  active:    'Actif',
  completed: 'Terminé',
  draft:     'Brouillon',
  on_hold:   'En pause',
};

function HealthBadge({ score, label }: { score: number; label: string }) {
  return (
    <span
      className="ev-health-badge"
      style={{
        background: HEALTH_BG[label] ?? '#f1f5f9',
        color: HEALTH_COLOR[label] ?? 'var(--text-body)',
      }}
    >
      {score}/100
    </span>
  );
}

function ProgressBar({ value, target }: { value: number; target: number }) {
  const safeValue  = Math.min(100, Math.max(0, value));
  const safeTarget = Math.min(100, Math.max(0, target));

  return (
    <div className="ev-progress-wrap">
      <div className="ev-progress-track">
        <div
          className="ev-progress-fill"
          style={{ width: `${safeValue}%` }}
        />
        <div
          className="ev-progress-target"
          style={{ left: `${safeTarget}%` }}
          title={`Cible : ${safeTarget}%`}
        />
      </div>
      <div className="ev-progress-labels">
        <span>{safeValue}%</span>
        <span className="ev-progress-target-label">{safeTarget}%</span>
      </div>
    </div>
  );
}

function KpiStrip({ projects }: { projects: ProjectEvaluation[] }) {
  const total    = projects.length;
  const avgScore = total > 0
    ? Math.round(projects.reduce((s, p) => s + p.health_score, 0) / total)
    : 0;
  const good     = projects.filter(p => p.health_score >= 75).length;
  const critical = projects.filter(p => p.health_score < 50).length;

  return (
    <div className="proj-kpi-row">
      {/* Total projets */}
      <div className="proj-kpi">
        <div className="proj-kpi__icon proj-kpi__icon--blue">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        </div>
        <div className="proj-kpi__body">
          <div className="proj-kpi__value">{total}</div>
          <div className="proj-kpi__label">Total projets</div>
        </div>
      </div>

      {/* Score moyen */}
      <div className="proj-kpi">
        <div className="proj-kpi__icon proj-kpi__icon--teal">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
        <div className="proj-kpi__body">
          <div
            className="proj-kpi__value"
            style={{ color: avgScore >= 75 ? 'var(--color-success)' : avgScore >= 50 ? 'var(--color-warning)' : avgScore > 0 ? 'var(--color-danger)' : undefined }}
          >
            {avgScore}
          </div>
          <div className="proj-kpi__label">Score moyen / 100</div>
        </div>
      </div>

      {/* Bonne santé */}
      <div className="proj-kpi">
        <div className="proj-kpi__icon proj-kpi__icon--green">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div className="proj-kpi__body">
          <div className="proj-kpi__value">{good}</div>
          <div className="proj-kpi__label">Bonne santé (≥ 75)</div>
        </div>
      </div>

      {/* Critiques */}
      <div className="proj-kpi">
        <div className="proj-kpi__icon proj-kpi__icon--red">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div className="proj-kpi__body">
          <div className="proj-kpi__value" style={{ color: critical > 0 ? 'var(--color-danger)' : undefined }}>{critical}</div>
          <div className="proj-kpi__label">Critiques (&lt; 50)</div>
        </div>
      </div>
    </div>
  );
}


export default function EvaluationPage() {
  const { data: projects, isLoading, isError } = useQuery({
    queryKey: ['portfolio-evaluation'],
    queryFn: getEvaluation,
  });

  return (
    <div>
      <PageHeader
        breadcrumb="PORTEFEUILLE · 2026"
        title="Évaluation des chantiers"
        subtitle="Scores de santé, avancement et indicateurs par projet"
      />

      {isLoading && <KpiStrip projects={[]} />}
      {!isLoading && !isError && projects && <KpiStrip projects={projects} />}

      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {isError && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p className="form-error">Erreur de chargement des données.</p>
          </div>
        )}

        {!isError && (
          isLoading ? (
            <p style={{ padding: '2rem', color: 'var(--text-muted)', textAlign: 'center' }}>Chargement…</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chantier</th>
                  <th>Statut</th>
                  <th>Avancement</th>
                  <th style={{ textAlign: 'center' }}>Health Score</th>
                  <th style={{ textAlign: 'center' }}>Planning</th>
                  <th style={{ textAlign: 'center' }}>Régularité</th>
                  <th style={{ textAlign: 'center' }}>Sécurité</th>
                  <th style={{ textAlign: 'center' }}>Nb logs</th>
                  <th style={{ textAlign: 'center' }}>Incidents</th>
                </tr>
              </thead>
              <tbody>
                {projects && projects.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Aucun projet trouvé.
                    </td>
                  </tr>
                )}

                {projects && projects.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="ev-project-cell">
                        <span className="ev-code-badge">{p.code}</span>
                        <span className="ev-project-name">{p.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`ev-status ev-status--${p.status}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="ev-td--progress">
                      <ProgressBar value={p.progress_percent} target={p.target_progress} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <HealthBadge score={p.health_score} label={p.health_label} />
                    </td>
                    <td style={{ textAlign: 'center' }} className="ev-score-cell">
                      <span style={{ color: p.planning_score >= 20 ? 'var(--color-success)' : p.planning_score >= 10 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                        {p.planning_score}
                      </span>
                      <span className="ev-score-max">/25</span>
                    </td>
                    <td style={{ textAlign: 'center' }} className="ev-score-cell">
                      <span style={{ color: p.regularity_score >= 20 ? 'var(--color-success)' : p.regularity_score >= 10 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                        {p.regularity_score}
                      </span>
                      <span className="ev-score-max">/25</span>
                    </td>
                    <td style={{ textAlign: 'center' }} className="ev-score-cell">
                      <span style={{ color: p.safety_score >= 20 ? 'var(--color-success)' : p.safety_score >= 10 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                        {p.safety_score}
                      </span>
                      <span className="ev-score-max">/25</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="ev-count">{p.total_logs}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`ev-count ${p.incident_count > 0 ? 'ev-count--danger' : ''}`}>
                        {p.incident_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
