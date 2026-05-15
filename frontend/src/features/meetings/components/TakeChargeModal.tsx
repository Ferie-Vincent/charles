import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProjectMembers, createMeeting, suggestMeetingDateTime,
} from '../api/meetings-api';
import type { ProjectMember } from '../api/meetings-api';

type Props = {
  alert: {
    id: string;
    type: string;
    message: string;
    project_code: string;
    project_id?: number;
    severity: string;
  };
  onClose: () => void;
  onSuccess: (alertId: string) => void;
};

const MEETING_TITLE_BY_TYPE: Record<string, string> = {
  overdue:         'Réunion rattrapage planning',
  no_journal:      'Point chantier — journaux manquants',
  planning_lag:    'Réunion rattrapage retard',
  open_incident:   'Réunion sécurité — incidents ouverts',
  health_critical: 'Réunion urgence — santé critique',
};

function hasContact(m: ProjectMember): boolean {
  return !!(m.email || m.phone);
}

export default function TakeChargeModal({ alert, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle]           = useState(MEETING_TITLE_BY_TYPE[alert.type] ?? 'Réunion chantier');
  const [scheduledAt, setScheduledAt] = useState(suggestMeetingDateTime());
  const [location, setLocation]     = useState('');
  const [notes, setNotes]           = useState('');
  const [selected, setSelected]     = useState<Set<number>>(new Set());
  const [done, setDone]             = useState(false);

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['project-members', alert.project_id],
    queryFn: () => alert.project_id ? getProjectMembers(alert.project_id) : Promise.resolve([]),
    enabled: !!alert.project_id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (members.length > 0) setSelected(new Set(members.map((m: ProjectMember) => m.id)));
  }, [members]);

  const noContactCount = members.filter((m: ProjectMember) => selected.has(m.id) && !hasContact(m)).length;
  const [confirmNoContact, setConfirmNoContact] = useState(false);

  const mutation = useMutation({
    mutationFn: () => createMeeting({
      project_code: alert.project_code,
      title,
      scheduled_at: new Date(scheduledAt).toISOString(),
      location: location || undefined,
      notes: notes || undefined,
      invitee_ids: [...selected],
      alert_key: alert.id,
      alert_type: alert.type,
      alert_detail: alert.message,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      setDone(true);
      setTimeout(() => onSuccess(alert.id), 1200);
    },
  });

  const toggleMember = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const fmtScheduled = () => {
    if (!scheduledAt) return '';
    return new Date(scheduledAt).toLocaleString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="tc-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tc-modal" role="dialog" aria-modal="true">

        <div className="tc-modal__header">
          <div>
            <span className="tc-modal__badge">📋 {alert.project_code}</span>
            <h2 className="tc-modal__title">Planifier une réunion</h2>
          </div>
          <button className="tc-modal__close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="tc-modal__alert-ctx">
          <span className={`tc-modal__sev tc-modal__sev--${alert.severity}`}>
            {alert.severity === 'critical' ? '🚨' : '⚠️'} {alert.message}
          </span>
        </div>

        <div className="tc-modal__body">
          <label className="tc-label">Objet de la réunion</label>
          <input
            className="tc-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={255}
            placeholder="Titre de la réunion"
          />

          <div className="tc-row">
            <div className="tc-field">
              <label className="tc-label">Date et heure</label>
              <input
                className="tc-input"
                type="datetime-local"
                value={scheduledAt}
                min={new Date().toISOString().slice(0, 16)}
                onChange={e => setScheduledAt(e.target.value)}
              />
              {scheduledAt && <span className="tc-hint">📅 {fmtScheduled()}</span>}
            </div>
            <div className="tc-field">
              <label className="tc-label">Lieu (optionnel)</label>
              <input
                className="tc-input"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Bureau, chantier, visio…"
                maxLength={255}
              />
            </div>
          </div>

          <label className="tc-label">Notes (optionnel)</label>
          <textarea
            className="tc-input tc-textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Points à aborder, documents à préparer…"
            maxLength={1000}
          />

          <label className="tc-label">
            Personnes à inviter
            <span className="tc-label__sub">
              {selected.size}/{members.length} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
          </label>

          {/* Warning : membres sans contact — friction explicite */}
          {noContactCount > 0 && (
            <div className="tc-warn tc-warn--active">
              <span>⚠️ {noContactCount} personne{noContactCount > 1 ? 's' : ''} sélectionnée{noContactCount > 1 ? 's' : ''} sans email ni téléphone — l'invitation ne leur parviendra pas.</span>
              <label className="tc-warn__confirm">
                <input
                  type="checkbox"
                  checked={confirmNoContact}
                  onChange={e => setConfirmNoContact(e.target.checked)}
                />
                Continuer sans inviter ces personnes
              </label>
            </div>
          )}

          {loadingMembers ? (
            <div className="tc-members-loading">Chargement des membres…</div>
          ) : members.length === 0 ? (
            <div className="tc-members-empty">
              Aucun membre assigné à ce chantier.<br />
              <small>Ajoutez des membres dans la fiche projet.</small>
            </div>
          ) : (
            <div className="tc-members">
              {members.map((m: ProjectMember) => {
                const contact = hasContact(m);
                return (
                  <label key={m.id} className={`tc-member${selected.has(m.id) ? ' tc-member--checked' : ''}${!contact ? ' tc-member--no-contact' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleMember(m.id)}
                      className="tc-member__check"
                    />
                    <span className="tc-member__avatar" style={{ background: avatarColor(m.name) }}>
                      {initials(m.name)}
                    </span>
                    <span className="tc-member__info">
                      <span className="tc-member__name">{m.name}</span>
                      {m.role && <span className="tc-member__role">{m.role}</span>}
                    </span>
                    <span className="tc-member__contact">
                      {m.phone
                        ? <span title="WhatsApp disponible">📱</span>
                        : m.email
                          ? <span title={m.email}>✉️</span>
                          : <span className="tc-member__no-contact" title="Aucun moyen de contact">⚠️</span>
                      }
                    </span>
                    {selected.has(m.id) && <span className="tc-member__tick">✓</span>}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="tc-modal__footer">
          <button className="tc-btn tc-btn--ghost" onClick={onClose} disabled={mutation.isPending || done}>
            Annuler
          </button>
          <button
            className={`tc-btn tc-btn--primary${done ? ' tc-btn--done' : ''}`}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || done || selected.size === 0 || !title || !scheduledAt || (noContactCount > 0 && !confirmNoContact)}
          >
            {done
              ? '✓ Invitations envoyées !'
              : mutation.isPending
                ? 'Envoi en cours…'
                : `Valider & Inviter ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </button>
        </div>

        {mutation.isError && (
          <p className="tc-modal__error">Erreur lors de la création. Vérifiez les données.</p>
        )}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#f97316'];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}
