import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboard } from '../../dashboard/api/get-dashboard';

const HEALTH_COLOR = { green: '#10b981', orange: '#f59e0b', red: '#ef4444' };
const HEALTH_LABEL = { green: 'Sain', orange: 'Attention', critical: 'Critique' };

function parseDate(d: string | null | undefined): Date | null {
  return d ? new Date(d) : null;
}

function fmt(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function TimelinePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    staleTime: 60_000,
  });
  const projects = data?.active_projects ?? [];

  const dated = projects.filter(p => p.start_date && p.end_date).sort(
    (a, b) => new Date(a.end_date!).getTime() - new Date(b.end_date!).getTime()
  );

  if (!dated.length && !isLoading) {
    return <div className="tl-empty">Aucun chantier actif avec dates contractuelles.</div>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allDates = dated.flatMap(p => [parseDate(p.start_date)!, parseDate(p.end_date)!]);
  const rangeStart = new Date(Math.min(...allDates.map(d => d.getTime())));
  const rangeEnd   = new Date(Math.max(...allDates.map(d => d.getTime())));

  // padding: 5% each side
  const pad = (rangeEnd.getTime() - rangeStart.getTime()) * 0.05;
  const viewStart = new Date(rangeStart.getTime() - pad);
  const viewEnd   = new Date(rangeEnd.getTime()   + pad);
  const viewRange = viewEnd.getTime() - viewStart.getTime();

  function pct(d: Date): number {
    return Math.max(0, Math.min(100, (d.getTime() - viewStart.getTime()) / viewRange * 100));
  }

  const todayPct = pct(today);
  const todayIsVisible = todayPct > 0 && todayPct < 100;

  // Adaptive tick interval based on range duration
  const rangeMonths = (viewEnd.getFullYear() - viewStart.getFullYear()) * 12
    + viewEnd.getMonth() - viewStart.getMonth();
  const tickStep = rangeMonths > 24 ? 3 : rangeMonths > 12 ? 2 : 1;

  const ticks: { label: string; pct: number; isYear: boolean }[] = [];
  const tick = new Date(viewStart);
  tick.setDate(1);
  tick.setMonth(Math.ceil(tick.getMonth() / tickStep) * tickStep);
  while (tick <= viewEnd) {
    const isYear = tick.getMonth() === 0;
    ticks.push({
      label: isYear
        ? tick.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        : tick.toLocaleDateString('fr-FR', { month: 'short' }),
      pct: pct(tick),
      isYear,
    });
    tick.setMonth(tick.getMonth() + tickStep);
  }

  return (
    <div className="tl-page">
      <div className="tl-header">
        <div>
          <h2 className="tl-title">Vue chronologique</h2>
          <p className="tl-sub">{dated.length} chantier{dated.length > 1 ? 's' : ''} actif{dated.length > 1 ? 's' : ''} avec dates contractuelles</p>
        </div>
        <div className="tl-legend">
          <span className="tl-legend__item"><span className="tl-legend__dot" style={{ background: '#10b981' }} />Sain</span>
          <span className="tl-legend__item"><span className="tl-legend__dot" style={{ background: '#f59e0b' }} />Attention</span>
          <span className="tl-legend__item"><span className="tl-legend__dot" style={{ background: '#ef4444' }} />Critique</span>
          <span className="tl-legend__item"><span className="tl-today-dot" />Aujourd'hui</span>
        </div>
      </div>

      {isLoading ? (
        <div className="tl-loading">Chargement…</div>
      ) : (
        <div className="tl-card">
          {/* Month axis */}
          <div className="tl-axis">
            <div className="tl-axis__labels">
              {ticks.map((t, i) => (
                <div key={i} className={`tl-axis__tick ${t.isYear ? 'tl-axis__tick--year' : ''}`} style={{ left: `${t.pct}%` }}>
                  <span className="tl-axis__label">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="tl-rows">
            {/* Today line */}
            {todayIsVisible && (
              <div className="tl-today-line" style={{ left: `${todayPct}%` }}>
                <span className="tl-today-line__label">Aujourd'hui</span>
              </div>
            )}

            {dated.map(project => {
              const start  = parseDate(project.start_date)!;
              const end    = parseDate(project.end_date)!;
              const color  = HEALTH_COLOR[project.health.status] ?? '#94a3b8';
              const left   = pct(start);
              const right  = pct(end);
              const width  = right - left;
              const isOverdue = end < today;

              // Expected progress = elapsed / total * 100
              const totalMs   = end.getTime() - start.getTime();
              const elapsedMs = Math.min(today.getTime() - start.getTime(), totalMs);
              const expectedPct = totalMs > 0 ? Math.max(0, Math.min(100, elapsedMs / totalMs * 100)) : 0;
              const actualPct   = project.health.progress ?? 0;

              return (
                <div key={project.id} className="tl-row">
                  <Link to={`/projects/${project.id}`} className="tl-row__name" title={project.name}>
                    <span className="tl-row__code">{project.code}</span>
                    <span className="tl-row__label">{project.name}</span>
                  </Link>

                  <div className="tl-row__track">
                    {/* Bar background (contractual span) */}
                    <div
                      className={`tl-bar ${isOverdue ? 'tl-bar--overdue' : ''}`}
                      style={{ left: `${left}%`, width: `${width}%`, borderColor: color }}
                    >
                      {/* Expected progress fill (lighter) */}
                      <div
                        className="tl-bar__expected"
                        style={{ width: `${expectedPct}%`, background: `${color}30` }}
                      />
                      {/* Actual progress fill */}
                      <div
                        className="tl-bar__actual"
                        style={{ width: `${actualPct}%`, background: color }}
                      />
                      {/* Score badge */}
                      <span className="tl-bar__score" style={{ color }}>
                        {actualPct}%
                      </span>
                    </div>

                    {/* Date labels */}
                    <span className="tl-bar__date tl-bar__date--start" style={{ left: `${left}%` }}>
                      {fmtShort(start)}
                    </span>
                    <span className="tl-bar__date tl-bar__date--end" style={{ left: `${right}%` }}>
                      {fmtShort(end)}{isOverdue ? ' ⚠' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
