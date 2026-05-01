import { Link } from 'react-router-dom';
import type { ActiveProject } from '../api/get-dashboard';

function getDaysDiff(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

type Status = 'overdue' | 'urgent' | 'soon' | 'ok' | 'planned';

function getStatus(days: number): Status {
  if (days < 0)    return 'overdue';
  if (days <= 30)  return 'urgent';
  if (days <= 90)  return 'soon';
  if (days <= 270) return 'ok';
  return 'planned';
}

type StatusConfig = { label: string; dot: string; bg: string; color: string };

const STATUS: Record<Status, StatusConfig> = {
  overdue: { label: 'En retard',       dot: '#EF4444', bg: '#FEF2F2', color: '#DC2626' },
  urgent:  { label: 'Échéance proche', dot: '#F59E0B', bg: '#FFFBEB', color: '#92400E' },
  soon:    { label: 'Échéance proche', dot: '#F59E0B', bg: '#FFFBEB', color: '#92400E' },
  ok:      { label: 'En cours',        dot: '#10B981', bg: '#ECFDF5', color: '#065F46' },
  planned: { label: 'Planifié',        dot: '#6366F1', bg: '#EEF2FF', color: '#4338CA' },
};

function splitName(name: string, location: string | null): { title: string; sub: string } {
  if (location) {
    const clean = name.includes(` – ${location}`) ? name.replace(` – ${location}`, '').trim() : name;
    return { title: clean, sub: location };
  }
  const idx = name.indexOf(' – ');
  if (idx > -1) return { title: name.slice(0, idx), sub: name.slice(idx + 3) };
  return { title: name, sub: '' };
}

type Props = { projects: ActiveProject[] };

export default function TimelineView({ projects }: Props) {
  const sorted = projects
    .filter(p => p.end_date)
    .map(p => {
      const days = getDaysDiff(p.end_date!);
      const status = getStatus(days);
      const { title, sub } = splitName(p.name, p.location);
      return { ...p, days, status, title, sub };
    })
    .sort((a, b) => a.days - b.days);

  if (!sorted.length) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Aucun chantier actif avec date de fin.</p>;
  }

  return (
    <div className="tl-grid">
      {sorted.map(p => {
        const cfg = STATUS[p.status];
        const delayText = p.days < 0
          ? `${Math.abs(p.days)} j de retard`
          : `${p.days} j restants`;
        const delayColor = p.days < 0 ? '#DC2626'
          : p.status === 'urgent' || p.status === 'soon' ? '#B45309'
          : 'var(--text-muted)';

        return (
          <Link key={p.id} to={`/projects/${p.id}`} className="tl-card-v2">
            <div className="tl-card-v2__head">
              <span className="tl-status" style={{ background: cfg.bg, color: cfg.color }}>
                <span className="tl-status__dot" style={{ background: cfg.dot }} />
                {cfg.label}
              </span>
              <span className="tl-card-v2__score">{p.health.score} pts</span>
            </div>

            <div className="tl-card-v2__name">{p.title}</div>
            {p.sub && <div className="tl-card-v2__loc">{p.sub}</div>}

            <div className="tl-card-v2__delay" style={{ color: delayColor }}>
              {delayText}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
