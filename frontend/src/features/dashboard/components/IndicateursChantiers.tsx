import type { ActiveProject } from '../api/get-dashboard';

const HEALTH_ICON = { green: '🟢', orange: '🟠', red: '🔴' };
const HEALTH_LABEL = { green: 'Sains', orange: 'Attention', red: 'Critique' };

type Indicateur = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
};

type Props = { projects: ActiveProject[] };

export default function IndicateursChantiers({ projects }: Props) {
  if (!projects.length) return null;

  const green  = projects.filter(p => p.health.status === 'green').length;
  const orange = projects.filter(p => p.health.status === 'orange').length;
  const red    = projects.filter(p => p.health.status === 'red').length;
  const avgScore = Math.round(projects.reduce((s, p) => s + p.health.score, 0) / projects.length);

  const healthRows = (
    ['green', 'orange', 'red'] as const
  ).map(status => ({
    icon: HEALTH_ICON[status],
    label: HEALTH_LABEL[status],
    value: status === 'green' ? green : status === 'orange' ? orange : red,
    color: status === 'green' ? '#059669' : status === 'orange' ? '#ea580c' : '#dc2626',
  }));

  const kpis: Indicateur[] = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
      label: 'Score santé moyen',
      value: `${avgScore} pts`,
      color: avgScore >= 75 ? '#059669' : avgScore >= 50 ? '#ea580c' : '#dc2626',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      label: 'Chantiers suivis',
      value: projects.length,
      color: '#3b7ddd',
    },
  ];

  return (
    <div className="indicateurs-card card">
      <div className="synthese-card__head">
        <div className="card-icon card-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h3 className="synthese-card__title">Indicateurs Clés BTP</h3>
      </div>

      <div className="indicateurs-card__body">
        {kpis.map(k => (
          <div key={String(k.label)} className="indic-row">
            <span className="indic-row__icon" style={{ color: k.color as string }}>{k.icon}</span>
            <span className="indic-row__label">{k.label}</span>
            <span className="indic-row__value" style={{ color: k.color as string }}>{k.value}</span>
          </div>
        ))}

        <div className="indic-health-grid">
          {healthRows.map(h => (
            <div key={h.label} className="indic-health-item">
              <span>{h.icon}</span>
              <span className="indic-health-item__label">{h.label}</span>
              <span className="indic-health-item__count" style={{ color: h.color }}>{h.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
