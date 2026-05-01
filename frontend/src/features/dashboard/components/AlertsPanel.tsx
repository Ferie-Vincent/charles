import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ProjectAlert } from '../api/get-dashboard';

const STORAGE_KEY = 'chantier:dismissed-alerts';

const SEVERITY_DOT: Record<ProjectAlert['severity'], string> = {
  critical: '#dc2626',
  warning:  '#ea580c',
};

const TYPE_ICON: Record<ProjectAlert['type'], string> = {
  overdue:        '⏰',
  no_journal:     '📋',
  planning_lag:   '📉',
  open_incident:  '⚠️',
  health_critical:'🔴',
};

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

type Props = { alerts: ProjectAlert[] };

export default function AlertsPanel({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  useEffect(() => { saveDismissed(dismissed); }, [dismissed]);

  const visible = alerts.filter(a => !dismissed.has(a.id));

  const total    = visible.length;
  const critical = visible.filter(a => a.severity === 'critical').length;

  return (
    <div className="alerts-panel card">
      <div className="alerts-panel__head">
        <span className="alerts-panel__title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Alertes importantes
        </span>
        <span className={`alerts-panel__badge ${critical > 0 ? 'alerts-panel__badge--critical' : 'alerts-panel__badge--warning'}`}>
          {total}
        </span>
      </div>

      {total === 0 ? (
        <p className="alerts-panel__empty">Aucune alerte active</p>
      ) : (
        <ul className="alerts-panel__list">
          {visible.map(alert => (
            <li key={alert.id} className={`ap-item ap-item--${alert.severity}`}>
              <span className="ap-item__type-icon">{TYPE_ICON[alert.type] ?? '•'}</span>
              <div className="ap-item__body">
                <span className="ap-item__code">{alert.project_code}</span>
                <span className="ap-item__msg">{alert.message}</span>
              </div>
              <Link to={alert.action_url} className="ap-item__link">→</Link>
              <button
                type="button"
                className="ap-item__close"
                onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
                aria-label="Masquer"
              >×</button>
            </li>
          ))}
        </ul>
      )}

      {total > 0 && (
        <button
          type="button"
          className="alerts-panel__clear"
          onClick={() => setDismissed(new Set(alerts.map(a => a.id)))}
        >
          Tout masquer
        </button>
      )}
    </div>
  );
}
