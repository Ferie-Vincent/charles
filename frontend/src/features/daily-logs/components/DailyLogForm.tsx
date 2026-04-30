import { useState } from 'react';
import { createDailyLog } from '../api/create-daily-log';
import type { CreateDailyLogPayload, EquipmentStatus, IncidentType, Weather } from '../types';

const WEATHER_OPTIONS: { value: Weather; label: string; icon: string }[] = [
  { value: 'Soleil',    label: 'Soleil',     icon: '☀️' },
  { value: 'Nuageux',  label: 'Nuageux',    icon: '⛅' },
  { value: 'Pluie',    label: 'Pluie',      icon: '🌧️' },
  { value: 'Orage',    label: 'Orage',      icon: '⛈️' },
  { value: 'Vent fort', label: 'Vent fort', icon: '💨' },
  { value: 'Autre',    label: 'Autre',      icon: '🌡️' },
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyLogged, setAlreadyLogged] = useState(false);

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
          <label htmlFor="workers_count">Effectif sur site *</label>
          <input
            id="workers_count"
            type="number"
            min="0"
            max="999"
            value={workersCount}
            onChange={e => setWorkersCount(Number(e.target.value))}
            required
          />
        </div>

        {/* Équipement — optionnel */}
        <div className="form-group">
          <label htmlFor="equipment_status">État équipement</label>
          <select
            id="equipment_status"
            value={equipmentStatus}
            onChange={e => setEquipmentStatus(e.target.value as EquipmentStatus)}
          >
            <option value="">-- Optionnel --</option>
            {EQUIPMENT_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* #33 Avancement — slider */}
      <div className="form-group">
        <label htmlFor="progress">
          Avancement réel — <strong>{progressPercent}%</strong>
        </label>
        <input
          id="progress"
          type="range"
          min="0"
          max="100"
          step="1"
          value={progressPercent}
          onChange={e => setProgressPercent(Number(e.target.value))}
          className="progress-slider"
        />
        <div className="progress-slider-labels">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
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
