import type { DailyLogMeta } from '../api/get-daily-logs';
import type { DailyLog } from '../types';

const WEATHER_ICON: Record<string, string> = {
  'Soleil': '☀️', 'Nuageux': '⛅', 'Pluie': '🌧️',
  'Orage': '⛈️', 'Vent fort': '💨', 'Autre': '🌡️',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

type Props = {
  logs: DailyLog[];
  meta: DailyLogMeta | null;
};

export default function DailyLogHistory({ logs, meta }: Props) {
  if (!logs.length) return <p className="empty-state">Aucun journal saisi pour ce chantier.</p>;

  return (
    <div className="daily-log-history">

      {meta && (
        <div className="log-meta-grid">
          <div className="log-meta-item">
            <span className="log-meta-value">{meta.latest_progress ?? '—'}%</span>
            <span className="log-meta-label">Avancement actuel</span>
          </div>
          <div className="log-meta-item">
            <span className="log-meta-value">{meta.total_logs}</span>
            <span className="log-meta-label">Jours suivis</span>
          </div>
          <div className="log-meta-item">
            <span className={`log-meta-value ${meta.incident_count > 0 ? 'log-meta-value--danger' : ''}`}>
              {meta.incident_count}
            </span>
            <span className="log-meta-label">Incidents</span>
          </div>
          <div className="log-meta-item">
            <span className="log-meta-value">{meta.avg_workers ?? '—'}</span>
            <span className="log-meta-label">Effectif moyen</span>
          </div>
        </div>
      )}

      <div className="log-list">
        {logs.map(log => (
          <div key={log.id} className={`log-row ${log.has_incident ? 'log-row--incident' : ''}`}>
            <span className="log-row__date">{formatDate(log.log_date)}</span>
            <span className="log-row__weather" title={log.weather}>{WEATHER_ICON[log.weather] ?? '🌡️'}</span>
            <div className="log-row__progress">
              <div className="log-row__progress-bar" style={{ width: `${log.progress_percent}%` }} />
              <span className="log-row__progress-label">{log.progress_percent}%</span>
            </div>
            <span className="log-row__workers">👷 {log.workers_count}</span>
            {log.has_incident && (
              <span className="badge badge-overdue log-row__incident">{log.incident_type ?? 'Incident'}</span>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
