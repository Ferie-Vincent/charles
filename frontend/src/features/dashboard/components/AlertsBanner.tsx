import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProjectAlert } from '../api/get-dashboard';

const TYPE_ICON: Record<ProjectAlert['type'], string> = {
  overdue:       '🔴',
  no_journal:    '📋',
  planning_lag:  '⏳',
  open_incident: '⚠️',
};

type Props = { alerts: ProjectAlert[] };

export default function AlertsBanner({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (!visible.length) return null;

  const criticals = visible.filter(a => a.severity === 'critical');
  const warnings  = visible.filter(a => a.severity === 'warning');

  return (
    <div className="alerts-banner">
      <div className="alerts-banner__header">
        <span className="alerts-banner__title">
          🚨 {criticals.length > 0 && <span className="alerts-count alerts-count--critical">{criticals.length} critique{criticals.length > 1 ? 's' : ''}</span>}
          {warnings.length > 0 && <span className="alerts-count alerts-count--warning">{warnings.length} avertissement{warnings.length > 1 ? 's' : ''}</span>}
        </span>
        <button
          type="button"
          className="alerts-banner__dismiss-all"
          onClick={() => setDismissed(new Set(alerts.map(a => a.id)))}
        >
          Tout masquer
        </button>
      </div>

      <div className="alerts-list">
        {visible.map(alert => (
          <div key={alert.id} className={`alert-item alert-item--${alert.severity}`}>
            <span className="alert-item__icon">{TYPE_ICON[alert.type]}</span>
            <div className="alert-item__body">
              <span className="alert-item__code">{alert.project_code}</span>
              <span className="alert-item__msg">{alert.message}</span>
            </div>
            <Link to={alert.action_url} className="alert-item__link">Voir →</Link>
            <button
              type="button"
              className="alert-item__close"
              onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
              aria-label="Masquer"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
