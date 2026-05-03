import { Link } from 'react-router-dom';
import type { Project } from '../types';

const STATUS_LABELS: Record<string, string> = {
  draft:     'Brouillon',
  active:    'Actif',
  completed: 'Terminé',
  archived:  'Archivé',
};

function fmt(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtBudget(amount: string) {
  return Number(amount).toLocaleString('fr-FR');
}

export default function ProjectCard({ p }: { p: Project }) {
  return (
    <Link to={`/projects/${p.id}`} className="pcard">
      <div className="pcard__header">
        <span className="pcard__code">{p.code}</span>
        <span className={`badge badge-${p.status}`}>{STATUS_LABELS[p.status] ?? p.status}</span>
      </div>

      <div className="pcard__name">{p.name}</div>

      <div className="pcard__meta">
        {p.location && (
          <div className="pcard__meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {p.location}
          </div>
        )}
        {(p.start_date || p.end_date) && (
          <div className="pcard__meta-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {fmt(p.start_date) ?? '—'} → {fmt(p.end_date) ?? '—'}
          </div>
        )}
      </div>

      {p.target_progress != null && (
        <div className="pcard__progress">
          <div className="pcard__progress-label">
            <span>Avancement</span>
            <span>{p.target_progress}%</span>
          </div>
          <div className="pcard__progress-track">
            <div className="pcard__progress-fill" style={{ width: `${p.target_progress}%` }} />
          </div>
        </div>
      )}

      <div className="pcard__divider" />

      <div className="pcard__footer">
        <div className="pcard__budget">
          {fmtBudget(p.budget_amount)} <span>FCFA</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ color: 'var(--primary)', opacity: 0.6 }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </Link>
  );
}
