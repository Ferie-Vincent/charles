import { useState } from 'react';
import { createDailyLog } from '../api/create-daily-log';
import type { CreateDailyLogPayload, EquipmentStatus, IncidentType, MaterialItem, Weather } from '../types';
import ProgressVisualPicker from './ProgressVisualPicker';

const WEATHER_OPTIONS: { value: Weather; label: string; icon: string }[] = [
  { value: 'Soleil',    label: 'Soleil',     icon: '☀️' },
  { value: 'Nuageux',  label: 'Nuageux',    icon: '⛅' },
  { value: 'Pluie',    label: 'Pluie',      icon: '🌧️' },
  { value: 'Orage',    label: 'Orage',      icon: '⛈️' },
  { value: 'Vent fort', label: 'Vent fort', icon: '💨' },
  { value: 'Autre',    label: 'Autre',      icon: '🌡️' },
];

const MATERIAL_OPTIONS: { name: string; icon: string }[] = [
  { name: 'Ciment',    icon: '🪨' },
  { name: 'Fer',       icon: '🔩' },
  { name: 'Sable',     icon: '🟡' },
  { name: 'Gravier',   icon: '⬛' },
  { name: 'Briques',   icon: '🧱' },
  { name: 'Bois',      icon: '🪵' },
  { name: 'Carrelage', icon: '🔲' },
  { name: 'Peinture',  icon: '🪣' },
  { name: 'Autre',     icon: '📦' },
];

const INCIDENT_TYPES: IncidentType[] = ['Retard', 'Accident', 'Litige', 'Rupture stock', 'Panne', 'RAS', 'Autre'];
const EQUIPMENT_STATUSES: EquipmentStatus[] = ['Bon', 'Moyen', 'Mauvais', 'Hors service'];

type Props = {
  projectId: number;
  onSuccess: () => void;
};

export default function DailyLogForm({ projectId, onSuccess }: Props) {
  const [hasIncident, setHasIncident] = useState(false);
  const [incidentType, setIncidentType] = useState<IncidentType | ''>('');
  const [weather, setWeather] = useState<Weather | ''>('');
  const [workersCount, setWorkersCount] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [equipmentStatus, setEquipmentStatus] = useState<EquipmentStatus | ''>('');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyLogged, setAlreadyLogged] = useState(false);

  function toggleMaterial(name: string) {
    setMaterials(prev =>
      prev.some(m => m.name === name)
        ? prev.filter(m => m.name !== name)
        : [...prev, { name, quantity: 1 }]
    );
  }

  function updateQty(name: string, qty: number) {
    setMaterials(prev => prev.map(m => m.name === name ? { ...m, quantity: qty } : m));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weather) return;

    setSubmitting(true);
    setError(null);

    const payload: CreateDailyLogPayload = {
      weather: weather as Weather,
      workers_count: workersCount,
      progress_percent: progressPercent,
      has_incident: hasIncident,
      ...(hasIncident && incidentType ? { incident_type: incidentType as IncidentType } : {}),
      ...(equipmentStatus ? { equipment_status: equipmentStatus as EquipmentStatus } : {}),
      ...(materials.length > 0 ? { materials_received: materials } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    try {
      await createDailyLog(projectId, payload);
      onSuccess();
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } };
      if (axiosError.response?.status === 422) {
        const errors = axiosError.response.data?.errors ?? {};
        if (errors.log_date) {
          setAlreadyLogged(true);
        } else {
          setError(Object.values(errors).flat().join(' '));
        }
      } else {
        setError('Erreur lors de la soumission.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (alreadyLogged) {
    return (
      <div className="daily-log-done">
        <span className="daily-log-done__icon">✓</span>
        <p>Journal déjà saisi pour aujourd'hui.</p>
      </div>
    );
  }

  return (
    <form className="daily-log-form" onSubmit={handleSubmit}>

      {/* #42 Problème-First */}
      <div className="daily-log-incident-toggle">
        <button
          type="button"
          className={`incident-btn ${hasIncident ? 'incident-btn--active' : ''}`}
          onClick={() => { setHasIncident(v => !v); setIncidentType(''); }}
        >
          <span className="incident-btn__icon">{hasIncident ? '🔴' : '🟢'}</span>
          <span>{hasIncident ? 'Incident signalé' : 'Pas d\'incident'}</span>
        </button>
        {hasIncident && (
          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label htmlFor="incident_type">Type d'incident *</label>
            <select
              id="incident_type"
              value={incidentType}
              onChange={e => setIncidentType(e.target.value as IncidentType)}
              required={hasIncident}
            >
              <option value="">-- Choisir --</option>
              {INCIDENT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* #33 Météo — 1 tap */}
      <div className="form-group">
        <label>Météo *</label>
        <div className="weather-grid">
          {WEATHER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`weather-btn ${weather === opt.value ? 'weather-btn--active' : ''}`}
              onClick={() => setWeather(opt.value)}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* #33 Effectif */}
      <div className="form-row">
        <div className="form-group">
          <label>Effectif sur site *</label>
          <div className="workers-stepper">
            <button
              type="button"
              className="workers-stepper__btn"
              onClick={() => setWorkersCount(c => Math.max(0, c - 1))}
              aria-label="Moins"
            >−</button>
            <span className="workers-stepper__value">{workersCount}</span>
            <button
              type="button"
              className="workers-stepper__btn"
              onClick={() => setWorkersCount(c => Math.min(999, c + 1))}
              aria-label="Plus"
            >+</button>
          </div>
        </div>

        {/* Équipement — radio buttons */}
        <div className="form-group">
          <label>État équipement <span className="form-optional">(optionnel)</span></label>
          <div className="equipment-radio-grid">
            {EQUIPMENT_STATUSES.map(s => (
              <button
                key={s}
                type="button"
                className={`equipment-radio-btn ${equipmentStatus === s ? 'equipment-radio-btn--active' : ''}`}
                onClick={() => setEquipmentStatus(equipmentStatus === s ? '' : s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* #29 Avancement — phase visual picker */}
      <ProgressVisualPicker value={progressPercent} onChange={setProgressPercent} />

      {/* #30 Matériaux reçus */}
      <div className="form-group">
        <label>Matériaux reçus <span className="form-optional">(optionnel)</span></label>
        <div className="material-grid">
          {MATERIAL_OPTIONS.map(opt => {
            const selected = materials.some(m => m.name === opt.name);
            return (
              <button
                key={opt.name}
                type="button"
                className={`material-btn ${selected ? 'material-btn--active' : ''}`}
                onClick={() => toggleMaterial(opt.name)}
              >
                <span>{opt.icon}</span>
                <span>{opt.name}</span>
              </button>
            );
          })}
        </div>

        {materials.length > 0 && (
          <div className="material-qty-list">
            {materials.map(m => (
              <div key={m.name} className="material-qty-row">
                <span className="material-qty-name">
                  {MATERIAL_OPTIONS.find(o => o.name === m.name)?.icon} {m.name}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={m.quantity}
                  onChange={e => updateQty(m.name, Number(e.target.value))}
                  className="material-qty-input"
                />
                <span className="material-qty-unit">unités</span>
                <button
                  type="button"
                  className="material-qty-remove"
                  onClick={() => toggleMaterial(m.name)}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Observations libres ── */}
      <div className="form-group">
        <label className="form-label">
          Observations
          <span className="form-optional">optionnel</span>
        </label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Ex : pas d'eau sur site, retard de livraison béton, paiement journalier non versé…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={2000}
        />
        {notes.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
            {notes.length} / 2000 caractères
          </span>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      <button
        type="submit"
        className="btn-primary"
        disabled={submitting || !weather}
      >
        {submitting ? 'Enregistrement…' : 'Valider la journée'}
      </button>

    </form>
  );
}
