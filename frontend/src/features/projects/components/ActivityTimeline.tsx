import type { ProjectActivity } from '../types';

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  status_change:  { icon: '⚡', color: 'timeline-dot--accent',   label: 'Statut' },
  member_added:   { icon: '👤', color: 'timeline-dot--success',  label: 'Équipe' },
  member_removed: { icon: '👤', color: 'timeline-dot--danger',   label: 'Équipe' },
  budget_update:  { icon: '💰', color: 'timeline-dot--warning',  label: 'Budget' },
  site_visit:     { icon: '🏗️', color: 'timeline-dot--muted',    label: 'Visite' },
  note:           { icon: '📋', color: 'timeline-dot--muted',    label: 'Note' },
  document:       { icon: '📄', color: 'timeline-dot--muted',    label: 'Document' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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
        const meta = TYPE_META[activity.type] ?? { icon: '•', color: 'timeline-dot--muted', label: activity.type };
        return (
          <div key={activity.id} className="timeline-item">
            <div className={`timeline-dot ${meta.color}`}>{meta.icon}</div>
            <div className="timeline-body">
              <div className="timeline-header">
                <span className="timeline-label">{meta.label}</span>
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
