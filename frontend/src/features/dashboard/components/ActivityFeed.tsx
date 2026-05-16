import { Link } from 'react-router-dom';
import type { DashboardData } from '../api/get-dashboard';
import { fmtDate } from '../../../lib/formatters';

const ACTIVITY_META: Record<string, { label: string; css: string }> = {
  status_change:  { label: 'Statut',   css: 'badge-type-status' },
  member_added:   { label: 'Équipe',   css: 'badge-type-team'   },
  member_removed: { label: 'Équipe',   css: 'badge-type-team'   },
  budget_update:  { label: 'Budget',   css: 'badge-type-budget' },
  site_visit:     { label: 'Visite',   css: 'badge-type-visit'  },
  note:           { label: 'Note',     css: 'badge-type-note'   },
  document:       { label: 'Document', css: 'badge-type-doc'    },
};

type Props = {
  activities: DashboardData['recent_activities'];
  /** Restreindre aux types d'activité listés (logistique, comptable...) */
  filter?: string[];
  /** Mode compact pour les grilles 2 colonnes (logistique) */
  compact?: boolean;
};

export default function ActivityFeed({ activities, filter, compact }: Props) {
  const visible = filter ? activities.filter(a => filter.includes(a.type)) : activities;

  const wrapStyle: React.CSSProperties = compact
    ? { margin: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
    : { marginTop: 0 };

  const wrapClass = compact ? 'card' : 'card card--full';
  const timelineStyle: React.CSSProperties = compact ? { overflowY: 'auto', flex: 1 } : {};

  return (
    <div className={wrapClass} style={wrapStyle}>
      <div className="card-head">
        <div className="card-icon card-icon--purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div><h3 className="card-title" style={{ margin: 0 }}>Activité récente</h3></div>
      </div>

      <div className="timeline" style={timelineStyle}>
        {visible.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0' }}>
            Aucune activité récente.
          </p>
        ) : visible.map(a => {
          const meta = ACTIVITY_META[a.type] ?? { label: a.type, css: 'badge-type-note' };
          return (
            <div key={a.id} className="timeline-item">
              <div className="timeline-body">
                <div className="timeline-header">
                  <span className={`badge ${meta.css}`}>{meta.label}</span>
                  <Link to={`/projects/${a.project.id}`} className="timeline-project-link">
                    {a.project.code}
                  </Link>
                  <span className="timeline-date">{fmtDate(a.created_at)}</span>
                </div>
                <p className="timeline-description">{a.description}</p>
                {a.user && <span className="timeline-author">— {a.user.name}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
