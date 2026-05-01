import { useEffect, useState } from 'react';
import { getHealthScore, type HealthScore } from '../api/get-health-score';

const LABEL_CONFIG = {
  good:     { icon: '🟢', color: 'var(--success)',  bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  warning:  { icon: '🟠', color: 'var(--warning)',  bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  critical: { icon: '🔴', color: 'var(--danger)',   bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  },
};

type Props = { projectId: number };

export default function HealthScoreBadge({ projectId }: Props) {
  const [data, setData] = useState<HealthScore | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getHealthScore(projectId).then(setData).catch(() => null);
  }, [projectId]);

  if (!data) return null;

  const cfg = LABEL_CONFIG[data.label];

  return (
    <div className="health-badge-wrap">
      <button
        type="button"
        className="health-badge"
        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
        onClick={() => setOpen(v => !v)}
        title="Score de santé du chantier"
      >
        <span className="health-badge__icon">{cfg.icon}</span>
        <span className="health-badge__score">{data.score}</span>
        <span className="health-badge__label">/100</span>
      </button>

      {open && (
        <div className="health-breakdown">
          <div className="health-breakdown__title">Score de santé</div>
          <div className="health-breakdown__rows">
            <BreakdownRow label="Planning" score={data.planning_score} detail={`${data.latest_progress}% réel / ${data.target_progress}% cible`} />
            <BreakdownRow label="Régularité" score={data.regularity_score} detail={`${data.total_logs} rapport${data.total_logs > 1 ? 's' : ''} saisi${data.total_logs > 1 ? 's' : ''}`} />
            <BreakdownRow label="Budget" score={data.budget_score} detail="Module en développement" />
            <BreakdownRow label="Sécurité" score={data.safety_score} detail={`${data.incident_count} incident${data.incident_count > 1 ? 's' : ''}`} />
          </div>
          <div className="health-breakdown__total" style={{ color: cfg.color }}>
            Total : {data.score} / 100
          </div>
        </div>
      )}
    </div>
  );
}

function BreakdownRow({ label, score, detail }: { label: string; score: number; detail: string }) {
  return (
    <div className="health-breakdown__row">
      <span className="health-breakdown__row-label">{label}</span>
      <div className="health-breakdown__bar-wrap">
        <div className="health-breakdown__bar">
          <div className="health-breakdown__bar-fill" style={{ width: `${(score / 25) * 100}%` }} />
        </div>
      </div>
      <span className="health-breakdown__row-score">{score}<span className="health-breakdown__row-max">/25</span></span>
      <span className="health-breakdown__row-detail">{detail}</span>
    </div>
  );
}
