import { useState, useEffect } from 'react';
import { getSafetyScore, type SafetyScore } from '../api/get-safety-score';

const GRADE_COLOR: Record<string, string> = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#f59e0b',
  D: '#ef4444',
};

const CIRCUMFERENCE = 2 * Math.PI * 36; // r=36

type Props = { projectId: number };

export default function SafetyScoreWidget({ projectId }: Props) {
  const [data, setData] = useState<SafetyScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSafetyScore(projectId).then(setData).finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="ss-panel ss-panel--loading"><p className="ss-empty">Chargement…</p></div>;
  if (!data) return null;

  const offset = CIRCUMFERENCE * (1 - data.score / 100);
  const color  = GRADE_COLOR[data.grade];

  return (
    <div className="ss-panel">
      <div className="ss-layout">
        {/* Circular score */}
        <div className="ss-ring-wrap">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="36" fill="none" strokeWidth="8" style={{ stroke: 'var(--color-border)' }} />
            <circle
              cx="48" cy="48" r="36" fill="none"
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform="rotate(-90 48 48)"
              style={{ stroke: color, transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="ss-ring-inner">
            <span className="ss-score" style={{ color }}>{data.score}</span>
            <span className="ss-grade" style={{ color }}>{data.grade}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="ss-breakdown">
          <p className="ss-period">{data.period}</p>
          <table className="ss-table">
            <tbody>
              <tr>
                <td><span className="ss-dot ss-dot--mineur" />Mineurs</td>
                <td className="ss-count">{data.counts.mineur}</td>
                <td className="ss-deduc">−{data.counts.mineur * 5} pts</td>
              </tr>
              <tr>
                <td><span className="ss-dot ss-dot--majeur" />Majeurs</td>
                <td className="ss-count">{data.counts.majeur}</td>
                <td className="ss-deduc">−{data.counts.majeur * 15} pts</td>
              </tr>
              <tr>
                <td><span className="ss-dot ss-dot--critique" />Critiques</td>
                <td className="ss-count">{data.counts.critique}</td>
                <td className="ss-deduc">−{data.counts.critique * 30} pts</td>
              </tr>
            </tbody>
          </table>
          <div className="ss-footer">
            <span>{data.counts.total} incident{data.counts.total !== 1 ? 's' : ''} ce mois</span>
            {data.counts.total > 0 && (
              <span className="ss-resolved">{data.resolved} résolu{data.resolved !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
