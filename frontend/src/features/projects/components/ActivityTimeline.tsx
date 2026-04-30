import type { ProjectActivity } from '../types';

const TYPE_META: Record<string, { label: string; badge: string; dot: string }> = {
  status_change:  { label: 'Statut',   badge: 'badge badge-type-status', dot: 'timeline-dot--accent'  },
  member_added:   { label: 'Équipe',   badge: 'badge badge-type-team',   dot: 'timeline-dot--success' },
  member_removed: { label: 'Équipe',   badge: 'badge badge-type-team',   dot: 'timeline-dot--danger'  },
  budget_update:  { label: 'Budget',   badge: 'badge badge-type-budget', dot: 'timeline-dot--warning' },
  site_visit:     { label: 'Visite',   badge: 'badge badge-type-visit',  dot: 'timeline-dot--info'    },
  note:           { label: 'Note',     badge: 'badge badge-type-note',   dot: 'timeline-dot--muted'   },
  document:       { label: 'Document', badge: 'badge badge-type-doc',    dot: 'timeline-dot--muted'   },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

type Props = { activities: ProjectActivity[] };

export default function ActivityTimeline({ activities }: Props) {
  if (activities.length === 0) {
    return <p className="empty-state">Aucune activité enregistrée.</p>;
  }

  const sorted = [...activities].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="timeline">
      {sorted.map(activity => {
        const meta = TYPE_META[activity.type] ?? { label: activity.type, badge: 'badge badge-type-note', dot: 'timeline-dot--muted' };
        return (
          <div key={activity.id} className="timeline-item">
            <div className={`timeline-dot ${meta.dot}`} />
            <div className="timeline-body">
              <div className="timeline-header">
                <span className={meta.badge}>{meta.label}</span>
                <span className="timeline-date">{formatDate(activity.created_at)}</span>
              </div>
              <p className="timeline-description">{activity.description}</p>
              {activity.user && (
                <span className="timeline-author">— {activity.user.name}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
