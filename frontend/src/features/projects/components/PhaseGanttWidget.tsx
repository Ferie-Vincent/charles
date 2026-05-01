import type { Project } from '../types';

const PHASES = [
  { name: 'Préparation',    short: 'Prép.',   color: '#94a3b8', ratio: 0.05 },
  { name: 'Infrastructure', short: 'Infra.',  color: '#f59e0b', ratio: 0.15 },
  { name: 'Gros Œuvre',     short: 'GO',      color: '#ef4444', ratio: 0.30 },
  { name: 'Enveloppe',      short: 'Env.',    color: '#8b5cf6', ratio: 0.25 },
  { name: 'Aménagements',   short: 'Amén.',   color: '#3b82f6', ratio: 0.20 },
  { name: 'Réception',      short: 'Récep.',  color: '#22c55e', ratio: 0.05 },
];

type Props = {
  project: Project;
  progressPercent: number | null;
};

function fmt(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function PhaseGanttWidget({ project, progressPercent }: Props) {
  if (!project.start_date || !project.end_date) {
    return (
      <div className="pg-panel">
        <p className="pg-empty">Dates contractuelles non définies — impossible de calculer le planning.</p>
      </div>
    );
  }

  const start    = new Date(project.start_date).getTime();
  const end      = new Date(project.end_date).getTime();
  const today    = Date.now();
  const duration = end - start;

  if (duration <= 0) return null;

  // Build phase timeline
  let cursor = start;
  const phases = PHASES.map(p => {
    const phaseStart = cursor;
    const phaseEnd   = cursor + duration * p.ratio;
    cursor           = phaseEnd;
    return { ...p, phaseStart, phaseEnd };
  });

  // How far through the total project are we?
  const elapsedRatio  = Math.min(1, Math.max(0, (today - start) / duration));
  const progressRatio = Math.min(1, (progressPercent ?? 0) / 100);

  // Today marker position (% of bar width)
  const todayPct = elapsedRatio * 100;

  return (
    <div className="pg-panel">
      <p className="pg-note">
        Planning estimé basé sur la distribution standard BTP · Avancement réel&nbsp;
        <strong>{progressPercent ?? 0} %</strong>
      </p>

      <div className="pg-chart">
        {/* Header: dates */}
        <div className="pg-header">
          <span className="pg-label-col" />
          <div className="pg-bar-col pg-bar-col--head">
            <span style={{ left: '0%' }}>{fmt(new Date(project.start_date))}</span>
            <span style={{ left: '50%', transform: 'translateX(-50%)' }}>
              {fmt(new Date((start + end) / 2))}
            </span>
            <span style={{ right: '0%' }}>{fmt(new Date(project.end_date))}</span>
          </div>
        </div>

        {/* Phase rows */}
        {phases.map(p => {
          const leftPct  = ((p.phaseStart - start) / duration) * 100;
          const widthPct = (p.ratio) * 100;

          // Progress fill within this phase
          const phaseElapsed = Math.min(1, Math.max(0, (today - p.phaseStart) / (p.phaseEnd - p.phaseStart)));
          const isActive  = today >= p.phaseStart && today < p.phaseEnd;
          const isDone    = today >= p.phaseEnd;

          return (
            <div key={p.name} className="pg-row">
              <span className="pg-label">{p.name}</span>
              <div className="pg-bar-col">
                <div
                  className="pg-track"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  {/* Background track */}
                  <div className="pg-track__bg" style={{ background: p.color + '28' }} />
                  {/* Progress fill */}
                  <div
                    className="pg-track__fill"
                    style={{
                      background: p.color,
                      width: isDone ? '100%' : isActive ? `${phaseElapsed * 100}%` : '0%',
                    }}
                  />
                  {/* Phase label inside bar */}
                  <span className="pg-track__label" style={{ color: isDone || isActive ? '#fff' : p.color }}>
                    {p.short}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Today line + real progress line */}
        <div className="pg-row pg-row--markers">
          <span className="pg-label-col" />
          <div className="pg-bar-col pg-bar-col--markers">
            {todayPct >= 0 && todayPct <= 100 && (
              <div className="pg-today" style={{ left: `${todayPct}%` }}>
                <div className="pg-today__line" />
                <span className="pg-today__label">Auj.</span>
              </div>
            )}
            {/* Real progress marker */}
            <div className="pg-progress-marker" style={{ left: `${progressRatio * 100}%` }}>
              <div className="pg-progress-marker__line" />
              <span className="pg-progress-marker__label">{progressPercent ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="pg-legend">
        <span className="pg-legend__item">
          <span className="pg-legend__line pg-legend__line--today" />Aujourd'hui
        </span>
        <span className="pg-legend__item">
          <span className="pg-legend__line pg-legend__line--progress" />{progressPercent ?? 0}% réel
        </span>
      </div>
    </div>
  );
}
