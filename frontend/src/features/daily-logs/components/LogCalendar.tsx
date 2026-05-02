import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DailyLog } from '../types';
import type { DailyLogMeta } from '../api/get-daily-logs';

/* ── Weather SVG icons ─────────────────────────────── */
function WeatherIcon({ weather, size = 20 }: { weather: string; size?: number }) {
  const s = { width: size, height: size, flexShrink: 0 as const };
  switch (weather) {
    case 'Soleil':
      return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      );
    case 'Nuageux':
      return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        </svg>
      );
    case 'Pluie':
      return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
          <line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/>
          <line x1="12" y1="15" x2="12" y2="23"/>
          <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
        </svg>
      );
    case 'Orage':
      return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 16.9A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
          <polyline points="13 11 9 17 15 17 11 23"/>
        </svg>
      );
    case 'Vent fort':
      return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/>
        </svg>
      );
    default:
      return (
        <svg {...s} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      );
  }
}

/* ── Equipment color ─────────────────────────────── */
const EQUIP_COLOR: Record<string, string> = {
  'Bon': '#10b981', 'Moyen': '#f59e0b', 'Mauvais': '#f97316', 'Hors service': '#ef4444',
};

/* ── Day detail modal ────────────────────────────── */
function LogDayModal({ log, onClose }: { log: DailyLog; onClose: () => void }) {
  const dateLabel = new Date(log.log_date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="mr-modal-overlay" onClick={onClose}>
      <div className="mr-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="mr-modal__head">
          <div className="mr-modal__head-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <WeatherIcon weather={log.weather} size={22} />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {log.weather}
              </span>
              {log.has_incident && (
                <span style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 6, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700 }}>
                  ⚠ Incident
                </span>
              )}
            </div>
            <h2 className="mr-modal__title" style={{ textTransform: 'capitalize' }}>{dateLabel}</h2>
          </div>
          <button type="button" className="mr-modal__close" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="mr-modal__body">
          {/* Progress */}
          <div className="mr-section">
            <div className="mr-section__label" style={{ marginBottom: 10 }}>
              <span className="mr-section__label-dot" style={{ background: '#3b82f6' }}/>
              Avancement
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 8, background: 'var(--bg-app)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${log.progress_percent}%`, height: '100%', background: '#3b82f6', borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#3b82f6', minWidth: 44, textAlign: 'right' }}>
                {log.progress_percent}%
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="mr-section">
            <div className="mr-section__label" style={{ marginBottom: 10 }}>
              <span className="mr-section__label-dot" style={{ background: '#10b981' }}/>
              Données terrain
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, background: 'var(--bg-app)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>{log.workers_count}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Ouvriers</div>
              </div>
              {log.equipment_status && (
                <div style={{ flex: 1, background: 'var(--bg-app)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: EQUIP_COLOR[log.equipment_status] ?? 'var(--text-main)' }}>
                    {log.equipment_status}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Équipement</div>
                </div>
              )}
            </div>
          </div>

          {/* Materials */}
          {log.materials_received && log.materials_received.length > 0 && (
            <div className="mr-section">
              <div className="mr-section__label" style={{ marginBottom: 8 }}>
                <span className="mr-section__label-dot" style={{ background: '#f59e0b' }}/>
                Matériaux reçus
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {log.materials_received.map((m, i) => (
                  <span key={i} className="log-material-chip">
                    {m.name}{m.quantity ? ` · ${m.quantity}${m.unit ?? ''}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Incident */}
          {log.has_incident && log.incident_type && log.incident_type !== 'RAS' && (
            <div className="mr-section" style={{ borderLeft: '3px solid #ef4444', paddingLeft: 12 }}>
              <div className="mr-section__label" style={{ marginBottom: 6 }}>
                <span className="mr-section__label-dot" style={{ background: '#ef4444' }}/>
                Incident signalé
              </div>
              <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.85rem' }}>{log.incident_type}</span>
            </div>
          )}

          {/* Notes */}
          {log.notes && (
            <div className="mr-section">
              <div className="mr-section__label" style={{ marginBottom: 6 }}>
                <span className="mr-section__label-dot" style={{ background: '#8b5cf6' }}/>
                Observations
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-body)', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
                {log.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: 4 }}>
            Saisi le {new Date(log.created_at).toLocaleDateString('fr-FR', {
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Calendar grid ───────────────────────────────── */
const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const offset   = firstDay === 0 ? 6 : firstDay - 1; // Monday-first
  const total    = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

type Props = {
  logs: DailyLog[];
  meta: DailyLogMeta | null;
  projectId: number;
};

export default function LogCalendar({ logs, meta, projectId }: Props) {
  const today      = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null);

  /* index logs by date */
  const logMap = new Map<string, DailyLog>(logs.map(l => [l.log_date, l]));

  const todayISO   = today.toLocaleDateString('en-CA');
  const loggedToday = logMap.has(todayISO);
  const todayLabel  = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const cells = buildCalendarDays(year, month);

  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="log-calendar">

      {/* CTA saisie */}
      {loggedToday ? (
        <div className="log-saisie-cta log-saisie-cta--done">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Journal saisi
          <span className="log-saisie-cta__date">{todayLabel}</span>
        </div>
      ) : (
        <Link to={`/projects/${projectId}/journal`} className="log-saisie-cta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Saisir le journal du jour
          <span className="log-saisie-cta__date">{todayLabel}</span>
        </Link>
      )}

      {/* Meta KPIs */}
      {meta && meta.total_logs > 0 && (
        <div className="log-meta-row">
          <div className="log-meta-stat">
            <span className="log-meta-stat__value" style={{ color: '#3b7ddd' }}>{meta.latest_progress ?? '—'}%</span>
            <span className="log-meta-stat__label">Avancement actuel</span>
          </div>
          <div className="log-meta-stat">
            <span className="log-meta-stat__value">{meta.total_logs}</span>
            <span className="log-meta-stat__label">Jours suivis</span>
          </div>
          <div className="log-meta-stat">
            <span className="log-meta-stat__value" style={{ color: (meta.incident_count ?? 0) > 0 ? '#ef4444' : '#10b981' }}>
              {meta.incident_count ?? 0}
            </span>
            <span className="log-meta-stat__label">Incidents</span>
          </div>
          <div className="log-meta-stat">
            <span className="log-meta-stat__value">{meta.avg_workers ?? '—'}</span>
            <span className="log-meta-stat__label">Effectif moyen</span>
          </div>
        </div>
      )}

      {/* Month navigation */}
      <div className="lcal-nav">
        <button type="button" className="lcal-nav__btn" onClick={prevMonth} aria-label="Mois précédent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="lcal-nav__label" style={{ textTransform: 'capitalize' }}>{monthLabel}</span>
        <button type="button" className="lcal-nav__btn" onClick={nextMonth} aria-label="Mois suivant">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Grid header */}
      <div className="lcal-grid">
        {WEEK_DAYS.map(d => (
          <div key={d} className="lcal-weekday">{d}</div>
        ))}

        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="lcal-cell lcal-cell--empty" />;

          const iso = isoDate(year, month, day);
          const log = logMap.get(iso);
          const isToday = iso === todayISO;

          return (
            <div
              key={iso}
              className={[
                'lcal-cell',
                log ? 'lcal-cell--logged' : 'lcal-cell--empty-day',
                isToday ? 'lcal-cell--today' : '',
                log?.has_incident ? 'lcal-cell--incident' : '',
              ].join(' ')}
              role={log ? 'button' : undefined}
              tabIndex={log ? 0 : undefined}
              aria-label={log ? `Journal du ${iso}` : undefined}
              onClick={log ? () => setSelectedLog(log) : undefined}
              onKeyDown={log ? (e) => (e.key === 'Enter' || e.key === ' ') && setSelectedLog(log) : undefined}
            >
              <span className="lcal-cell__day">{day}</span>

              {log ? (
                <>
                  <div className="lcal-cell__weather">
                    <WeatherIcon weather={log.weather} size={18} />
                  </div>
                  <div className="lcal-cell__workers">
                    <span className="lcal-cell__workers-count">{log.workers_count}</span>
                    <span className="lcal-cell__workers-label">ouv.</span>
                  </div>
                  <div className="lcal-cell__pct">{log.progress_percent}%</div>
                  {log.has_incident && <div className="lcal-cell__incident-dot" title={log.incident_type ?? 'Incident'} />}
                </>
              ) : null}

              {isToday && !log && (
                <div className="lcal-cell__today-ring" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="lcal-legend">
        <span className="lcal-legend__item">
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 4, background: '#0f172a', marginRight: 4 }}/>
          Jour saisi
        </span>
        <span className="lcal-legend__item">
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 4, background: '#1a0a0a', border: '1.5px solid #ef4444', marginRight: 4 }}/>
          Incident
        </span>
        <span className="lcal-legend__item">
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid #60a5fa', marginRight: 4 }}/>
          Aujourd'hui
        </span>
      </div>

      {/* Empty state */}
      {logs.length === 0 && (
        <div className="log-empty" style={{ marginTop: 16 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40" style={{ color: 'var(--border-strong)', marginBottom: 12 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p>Aucun journal saisi pour ce chantier.</p>
        </div>
      )}

      {/* Day detail modal */}
      {selectedLog && (
        <LogDayModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
