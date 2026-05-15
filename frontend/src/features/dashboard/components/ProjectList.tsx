import React from 'react';
import { Link } from 'react-router-dom';
import type { DashboardData } from '../api/get-dashboard';

const HEALTH_COLOR: Record<string, string> = {
  green: '#10b981',
  orange: '#f59e0b',
  red: '#ef4444',
};

const ICON_EDIT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const ICON_EXTERNAL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

export type ProjectListVariant = 'journal' | 'view';

type Props = {
  projects: DashboardData['active_projects'];
  subtitle: string;
  ctaLabel: string;
  ctaTo: (id: number) => string;
  /** 'journal' = edit icon, 'view' = external link icon */
  variant?: ProjectListVariant;
  showHealthScore?: boolean;
  compact?: boolean;
};

export default function ProjectList({
  projects, subtitle, ctaLabel, ctaTo, variant = 'journal', showHealthScore, compact,
}: Props) {
  const wrapClass = compact ? 'card' : 'card card--full';
  const wrapStyle: React.CSSProperties = compact
    ? { margin: 0, display: 'flex', flexDirection: 'column' }
    : { marginTop: '1.5rem', marginBottom: '1.5rem' };
  const listStyle: React.CSSProperties = compact ? { flex: 1, overflowY: 'auto' } : {};

  return (
    <div className={wrapClass} style={wrapStyle}>
      <div className="card-head">
        <div className="card-icon card-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Chantiers actifs</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>{subtitle}</p>
        </div>
      </div>
      <div className="terrain-project-list" style={listStyle}>
        {projects.map(p => (
          <div key={p.id} className="terrain-project-row">
            <div className="terrain-project-row__info">
              <span className="terrain-project-row__code" style={{ borderColor: HEALTH_COLOR[p.health.status] ?? '#94a3b8' }}>
                {p.code}
              </span>
              <span className="terrain-project-row__name">{p.name}</span>
            </div>
            <div className="terrain-project-row__actions">
              {showHealthScore && (
                <span className="terrain-project-row__score" style={{ color: HEALTH_COLOR[p.health.status] ?? '#94a3b8' }}>
                  {p.health.score}/100
                </span>
              )}
              <Link to={ctaTo(p.id)} className="terrain-project-row__cta">
                {variant === 'view' ? ICON_EXTERNAL : ICON_EDIT}
                {ctaLabel}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
