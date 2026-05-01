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

function KpiBar({ projects }: { projects: ProjectEvaluation[] }) {
  const total   = projects.length;
  const avgScore = total > 0
    ? Math.round(projects.reduce((s, p) => s + p.health_score, 0) / total)
    : 0;
  const good     = projects.filter(p => p.health_score >= 75).length;
  const critical = projects.filter(p => p.health_score < 50).length;

  return (
    <div className="ev-kpi-bar">
      <div className="ev-kpi-card">
        <div className="ev-kpi-value">{total}</div>
        <div className="ev-kpi-label">Total projets</div>
      </div>
      <div className="ev-kpi-card">
        <div className="ev-kpi-value" style={{ color: avgScore >= 75 ? 'var(--color-success)' : avgScore >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
          {avgScore}
        </div>
        <div className="ev-kpi-label">Score moyen</div>
      </div>
      <div className="ev-kpi-card">
        <div className="ev-kpi-value" style={{ color: 'var(--color-success)' }}>{good}</div>
        <div className="ev-kpi-label">Bonne santé (≥ 75)</div>
      </div>
      <div className="ev-kpi-card">
        <div className="ev-kpi-value" style={{ color: 'var(--color-danger)' }}>{critical}</div>
        <div className="ev-kpi-label">Critiques ({"< 50"})</div>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="ev-table-row ev-table-row--skeleton">
          {Array.from({ length: 9 }).map((_, j) => (
            <td key={j}><span className="ev-skeleton" /></td>
          ))}
        </tr>
      ))}
    </>
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

      {isLoading && <KpiBar projects={[]} />}
      {!isLoading && !isError && projects && <KpiBar projects={projects} />}

      <div className="ev-table-wrap">
        {isError && (
          <div className="ev-empty">
            <p className="form-error">Erreur de chargement des données.</p>
          </div>
        )}

        {!isError && (
          <table className="ev-table">
            <thead>
              <tr>
                <th className="ev-th">Chantier</th>
                <th className="ev-th">Statut</th>
                <th className="ev-th">Avancement</th>
                <th className="ev-th ev-th--center">Health Score</th>
                <th className="ev-th ev-th--center">Planning</th>
                <th className="ev-th ev-th--center">Régularité</th>
                <th className="ev-th ev-th--center">Sécurité</th>
                <th className="ev-th ev-th--center">Nb logs</th>
                <th className="ev-th ev-th--center">Incidents</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows />}

              {!isLoading && projects && projects.length === 0 && (
                <tr>
                  <td colSpan={9} className="ev-empty-cell">
                    Aucun projet trouvé.
                  </td>
                </tr>
              )}

              {!isLoading && projects && projects.map(p => (
                <tr key={p.id} className="ev-table-row">
                  <td className="ev-td">
                    <div className="ev-project-cell">
                      <span className="ev-code-badge">{p.code}</span>
                      <span className="ev-project-name">{p.name}</span>
                    </div>
                  </td>
                  <td className="ev-td">
                    <span className={`ev-status ev-status--${p.status}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="ev-td ev-td--progress">
                    <ProgressBar value={p.progress_percent} target={p.target_progress} />
                  </td>
                  <td className="ev-td ev-td--center">
                    <HealthBadge score={p.health_score} label={p.health_label} />
                  </td>
                  <td className="ev-td ev-td--center ev-score-cell">
                    <span style={{ color: p.planning_score >= 20 ? 'var(--color-success)' : p.planning_score >= 10 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                      {p.planning_score}
                    </span>
                    <span className="ev-score-max">/25</span>
                  </td>
                  <td className="ev-td ev-td--center ev-score-cell">
                    <span style={{ color: p.regularity_score >= 20 ? 'var(--color-success)' : p.regularity_score >= 10 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                      {p.regularity_score}
                    </span>
                    <span className="ev-score-max">/25</span>
                  </td>
                  <td className="ev-td ev-td--center ev-score-cell">
                    <span style={{ color: p.safety_score >= 20 ? 'var(--color-success)' : p.safety_score >= 10 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                      {p.safety_score}
                    </span>
                    <span className="ev-score-max">/25</span>
                  </td>
                  <td className="ev-td ev-td--center">
                    <span className="ev-count">{p.total_logs}</span>
                  </td>
                  <td className="ev-td ev-td--center">
                    <span className={`ev-count ${p.incident_count > 0 ? 'ev-count--danger' : ''}`}>
                      {p.incident_count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
