import { Link } from 'react-router-dom';
import type { LeaderboardEntry } from '../api/get-dashboard';

const MAX_SCORE = 80;

type Props = { entries: LeaderboardEntry[] };

export default function LeaderboardCard({ entries }: Props) {
  if (!entries.length) {
    return <p className="empty-state">Aucun chantier actif à classer.</p>;
  }

  return (
    <div className="leaderboard">
      {entries.map((entry) => (
        <div key={entry.id} className="lb-row">
          <span className="lb-medal">{entry.medal ?? '—'}</span>

          <div className="lb-info">
            <Link to={`/projects/${entry.id}`} className="lb-name">{entry.name}</Link>
            <span className="lb-code">{entry.code}</span>
          </div>

          <div className="lb-bar-wrap">
            <div
              className="lb-bar"
              style={{ width: `${Math.min((entry.score / MAX_SCORE) * 100, 100)}%` }}
            />
          </div>

          <span className="lb-score">{entry.score} pts</span>

          <div className="lb-stats">
            <span title="Avancement">{entry.progress}%</span>
            <span title="Jours suivis">📋 {entry.total_logs}</span>
            {entry.incident_count > 0 && (
              <span className="lb-stat--danger" title="Incidents">⚠️ {entry.incident_count}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
