import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DailyLog } from '../types';
import type { DailyLogMeta } from '../api/get-daily-logs';

const WEATHER_ICON: Record<string, string> = {
  'Soleil': '☀️', 'Nuageux': '⛅', 'Pluie': '🌧️',
  'Orage': '⛈️', 'Vent fort': '💨', 'Autre': '🌡️',
};

const EQUIPMENT_COLOR: Record<string, string> = {
  'Bon':         '#10b981',
  'Moyen':       '#f59e0b',
  'Mauvais':     '#f97316',
  'Hors service':'#ef4444',
};

function formatDay(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

type Props = {
  logs: DailyLog[];
  meta: DailyLogMeta | null;
  projectId: number;
};

export default function LogExplorer({ logs, meta, projectId }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const todayISO = new Date().toLocaleDateString('en-CA');
  const loggedToday = logs.some(l => l.log_date === todayISO);
  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="log-explorer">

      {/* ── CTA ── */}
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

      {/* ── Meta KPIs ── */}
      {meta && meta.total_logs > 0 && (
        <div className="log-meta-row">
          <div className="log-meta-stat">
            <span className="log-meta-stat__value" style={{ color: '#3b7ddd' }}>
              {meta.latest_progress ?? '—'}%
            </span>
            <span className="log-meta-stat__label">Avancement actuel</span>
          </div>
          <div className="log-meta-stat">
            <span className="log-meta-stat__value">{meta.total_logs}</span>
            <span className="log-meta-stat__label">Jours suivis</span>
          </div>
          <div className="log-meta-stat">
            <span className="log-meta-stat__value" style={{ color: meta.incident_count > 0 ? '#ef4444' : '#10b981' }}>
              {meta.incident_count}
            </span>
            <span className="log-meta-stat__label">Incidents</span>
          </div>
          <div className="log-meta-stat">
            <span className="log-meta-stat__value">{meta.avg_workers ?? '—'}</span>
            <span className="log-meta-stat__label">Effectif moyen</span>
          </div>
        </div>
      )}

      {/* ── Log list ── */}
      {logs.length === 0 ? (
        <div className="log-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40" style={{ color: 'var(--border-strong)', marginBottom: 12 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
          <p>Aucun journal saisi pour ce chantier.</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Le premier rapport définit le point de départ du suivi.
          </p>
        </div>
      ) : (
        <div className="log-cards">
          {logs.map(log => {
            const open = expanded.has(log.id);
            return (
              <div
                key={log.id}
                className={`log-card ${log.has_incident ? 'log-card--incident' : ''}`}
              >
                <button
                  type="button"
                  className="log-card__header"
                  onClick={() => toggle(log.id)}
                  aria-expanded={open}
                >
                  <span className="log-card__weather" title={log.weather}>
                    {WEATHER_ICON[log.weather] ?? '🌡️'}
                  </span>
                  <span className="log-card__date">{formatDay(log.log_date)}</span>

                  <div className="log-card__progress">
                    <div className="log-card__bar">
                      <div
                        className="log-card__bar-fill"
                        style={{ width: `${log.progress_percent}%` }}
                      />
                    </div>
                    <span className="log-card__pct">{log.progress_percent}%</span>
                  </div>

                  <span className="log-card__workers">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    {log.workers_count}
                  </span>

                  {log.has_incident && (
                    <span className="log-card__incident-badge">
                      ⚠ {log.incident_type ?? 'Incident'}
                    </span>
                  )}

                  <span className="log-card__chevron" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
                  </span>
                </button>

                {open && (
                  <div className="log-card__detail">
                    {log.equipment_status && (
                      <div className="log-detail-row">
                        <span className="log-detail-row__label">Équipement</span>
                        <span
                          className="log-detail-row__badge"
                          style={{
                            color: EQUIPMENT_COLOR[log.equipment_status] ?? 'var(--text-main)',
                            background: `${EQUIPMENT_COLOR[log.equipment_status] ?? '#94a3b8'}18`,
                            borderColor: `${EQUIPMENT_COLOR[log.equipment_status] ?? '#94a3b8'}40`,
                          }}
                        >
                          {log.equipment_status}
                        </span>
                      </div>
                    )}

                    {log.materials_received && log.materials_received.length > 0 && (
                      <div className="log-detail-row">
                        <span className="log-detail-row__label">Matériaux reçus</span>
                        <div className="log-detail-row__chips">
                          {log.materials_received.map((m, i) => (
                            <span key={i} className="log-material-chip">
                              {m.name}{m.quantity ? ` · ${m.quantity}${m.unit ?? ''}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {log.has_incident && log.incident_type && log.incident_type !== 'RAS' && (
                      <div className="log-detail-row log-detail-row--incident">
                        <span className="log-detail-row__label">Incident signalé</span>
                        <span className="log-card__incident-badge">{log.incident_type}</span>
                      </div>
                    )}

                    {log.notes && (
                      <div className="log-detail-notes">
                        <span className="log-detail-row__label">Observations</span>
                        <p className="log-detail-notes__text">{log.notes}</p>
                      </div>
                    )}

                    <div className="log-detail-row">
                      <span className="log-detail-row__label">Saisi le</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
