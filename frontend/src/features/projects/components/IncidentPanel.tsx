import { useState, useEffect } from 'react';
import {
  getIncidents, createIncident, updateIncident, deleteIncident, incidentPdfUrl,
  type Incident, type IncidentInput,
} from '../api/get-incidents';

const INCIDENT_TYPES = ['Retard', 'Accident', 'Litige', 'Rupture stock', 'Panne', 'Autre'];

const SEVERITY_LABELS: Record<Incident['severity'], string> = {
  mineur: 'Mineur',
  majeur: 'Majeur',
  critique: 'Critique',
};

const STATUS_LABELS: Record<Incident['status'], string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  resolu: 'Résolu',
  ferme: 'Fermé',
};

type Props = { projectId: number };

const EMPTY_FORM: IncidentInput = {
  type: '',
  severity: 'mineur',
  description: '',
  location: '',
  corrective_action: '',
  witnesses: '',
  occurred_at: new Date().toISOString().slice(0, 16),
};

export default function IncidentPanel({ projectId }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState<IncidentInput>(EMPTY_FORM);

  useEffect(() => {
    getIncidents(projectId).then(setIncidents).finally(() => setLoading(false));
  }, [projectId]);

  function set(field: keyof IncidentInput, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type || !form.description) return;
    setSaving(true);
    try {
      const incident = await createIncident(projectId, form);
      setIncidents(prev => [incident, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(incident: Incident, status: Incident['status']) {
    const updated = await updateIncident(projectId, incident.id, {
      status,
      resolved_at: status === 'resolu' ? new Date().toISOString() : undefined,
    });
    setIncidents(prev => prev.map(i => i.id === incident.id ? updated : i));
  }

  async function handleDelete(incident: Incident) {
    if (!confirm(`Supprimer la fiche #INC-${String(incident.id).padStart(4, '0')} ?`)) return;
    await deleteIncident(projectId, incident.id);
    setIncidents(prev => prev.filter(i => i.id !== incident.id));
  }

  function openPdf(incident: Incident) {
    window.open(incidentPdfUrl(projectId, incident.id), '_blank');
  }

  return (
    <div className="incident-panel">
      <div className="incident-panel__header">
        <div>
          <h3 className="incident-panel__title">Incidents signalés</h3>
          <p className="incident-panel__sub">{incidents.length} incident{incidents.length !== 1 ? 's' : ''} enregistré{incidents.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="inc-btn inc-btn--primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Annuler' : '+ Signaler un incident'}
        </button>
      </div>

      {showForm && (
        <form className="inc-form" onSubmit={handleSubmit}>
          <div className="inc-form__row">
            <div className="inc-form__field">
              <label>Type d'incident *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} required>
                <option value="">— Sélectionner —</option>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="inc-form__field">
              <label>Gravité *</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value as Incident['severity'])} required>
                <option value="mineur">Mineur</option>
                <option value="majeur">Majeur</option>
                <option value="critique">Critique</option>
              </select>
            </div>
            <div className="inc-form__field">
              <label>Date & heure *</label>
              <input type="datetime-local" value={form.occurred_at} onChange={e => set('occurred_at', e.target.value)} required />
            </div>
          </div>

          <div className="inc-form__field">
            <label>Lieu sur le chantier</label>
            <input type="text" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Zone A, RDC, Toiture…" />
          </div>

          <div className="inc-form__field">
            <label>Description *</label>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} required placeholder="Décrivez l'incident en détail…" />
          </div>

          <div className="inc-form__field">
            <label>Actions correctives</label>
            <textarea rows={2} value={form.corrective_action} onChange={e => set('corrective_action', e.target.value)} placeholder="Mesures prises ou à prendre…" />
          </div>

          <div className="inc-form__field">
            <label>Témoins / Personnes impliquées</label>
            <input type="text" value={form.witnesses} onChange={e => set('witnesses', e.target.value)} placeholder="Noms des témoins…" />
          </div>

          <div className="inc-form__actions">
            <button type="submit" className="inc-btn inc-btn--primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer l\'incident'}
            </button>
            <button type="button" className="inc-btn" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="inc-empty">Chargement…</p>
      ) : incidents.length === 0 ? (
        <p className="inc-empty">Aucun incident signalé sur ce chantier.</p>
      ) : (
        <div className="inc-list">
          {incidents.map(incident => (
            <div key={incident.id} className={`inc-card inc-card--${incident.severity}`}>
              <div className="inc-card__left">
                <div className="inc-card__id">#INC-{String(incident.id).padStart(4, '0')}</div>
                <span className={`inc-sev inc-sev--${incident.severity}`}>{SEVERITY_LABELS[incident.severity]}</span>
              </div>

              <div className="inc-card__body">
                <div className="inc-card__top">
                  <span className="inc-card__type">{incident.type}</span>
                  {incident.location && <span className="inc-card__loc">📍 {incident.location}</span>}
                  <span className="inc-card__date">
                    {new Date(incident.occurred_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p className="inc-card__desc">{incident.description}</p>
                {incident.corrective_action && (
                  <p className="inc-card__action">✓ {incident.corrective_action}</p>
                )}
                {incident.reporter && (
                  <span className="inc-card__by">Déclaré par {incident.reporter.name}</span>
                )}
              </div>

              <div className="inc-card__right">
                <select
                  className={`inc-status inc-status--${incident.status}`}
                  value={incident.status}
                  onChange={e => handleStatusChange(incident, e.target.value as Incident['status'])}
                >
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <button className="inc-icon-btn inc-icon-btn--pdf" onClick={() => openPdf(incident)} title="Générer PDF">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                  </svg>
                  PDF
                </button>
                <button className="inc-icon-btn inc-icon-btn--del" onClick={() => handleDelete(incident)} title="Supprimer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
