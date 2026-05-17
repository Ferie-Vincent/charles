import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createDailyLog } from '../api/create-daily-log';
import type { CreateDailyLogPayload, EquipmentStatus, IncidentType, MaterialItem, Weather } from '../types';
import ProgressVisualPicker from './ProgressVisualPicker';
import { getLastDailyLog, getMaterialSuggestions } from '../../ai/api/ai';

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

const GEOFENCE_RADIUS_KM = 2;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Props = {
  projectId: number;
  projectLatitude?: number | null;
  projectLongitude?: number | null;
  onSuccess: () => void;
};

export default function DailyLogForm({ projectId, projectLatitude, projectLongitude, onSuccess }: Props) {
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
  const [geoBlocked, setGeoBlocked] = useState<string | null>(null);
  const [geoChecking, setGeoChecking] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Pre-fill from last log
  const { data: lastLog } = useQuery({
    queryKey: ['daily-log-last', projectId],
    queryFn: () => getLastDailyLog(projectId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // AI material suggestions
  const { data: aiSuggestions = [] } = useQuery({
    queryKey: ['ai-material-suggestions', projectId],
    queryFn: () => getMaterialSuggestions(projectId),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  // Apply pre-fill once last log is loaded (only if user hasn't touched form yet)
  useEffect(() => {
    if (!lastLog || prefilled) return;
    setWeather(lastLog.weather ?? '');
    setWorkersCount(lastLog.workers_count ?? 0);
    setProgressPercent(lastLog.progress_percent ?? 0);
    if (lastLog.equipment_status) setEquipmentStatus(lastLog.equipment_status);
    setPrefilled(true);
  }, [lastLog, prefilled]);

  useEffect(() => {
    if (!projectLatitude || !projectLongitude) return;
    if (!navigator.geolocation) return;

    setGeoChecking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineKm(pos.coords.latitude, pos.coords.longitude, projectLatitude, projectLongitude);
        if (dist > GEOFENCE_RADIUS_KM) {
          setGeoBlocked(
            `Vous êtes à ${dist.toFixed(1)} km du chantier. Vous devez être dans un rayon de ${GEOFENCE_RADIUS_KM} km pour remplir le journal.`,
          );
        }
        setGeoChecking(false);
      },
      () => setGeoChecking(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [projectLatitude, projectLongitude]);

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

  function toggleVoice() {
    const SR = (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      || (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ');
      setNotes(prev => (prev ? prev + ' ' : '') + transcript);
    };
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
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

  if (geoChecking) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-subtle)' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" style={{ display: 'block', margin: '0 auto 8px' }}>
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
        </svg>
        Vérification de votre position…
      </div>
    );
  }

  if (geoBlocked) {
    return (
      <div style={{ padding: '20px' }}>
        <div className="btp-alert btp-alert--danger" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>Accès refusé — hors zone chantier</strong>
            <p style={{ margin: '4px 0 0', fontSize: '13px' }}>{geoBlocked}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasSpeech = !!(
    (window as typeof window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
    || (window as typeof window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
  );

  return (
    <form className="daily-log-form" onSubmit={handleSubmit}>

      {prefilled && lastLog && (
        <div className="ai-prefill-banner">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
          </svg>
          Pré-rempli depuis le journal du {new Date(lastLog.log_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </div>
      )}

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
        <label>
          Matériaux reçus <span className="form-optional">(optionnel)</span>
          {aiSuggestions.length > 0 && (
            <span className="ai-suggestion-label">IA : suggestions basées sur l'historique</span>
          )}
        </label>
        <div className="material-grid">
          {MATERIAL_OPTIONS.map(opt => {
            const selected = materials.some(m => m.name === opt.name);
            const isSuggested = aiSuggestions.includes(opt.name);
            return (
              <button
                key={opt.name}
                type="button"
                className={`material-btn ${selected ? 'material-btn--active' : ''} ${isSuggested && !selected ? 'material-btn--suggested' : ''}`}
                onClick={() => toggleMaterial(opt.name)}
              >
                <span>{opt.icon}</span>
                <span>{opt.name}</span>
                {isSuggested && !selected && <span className="material-btn__dot" />}
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

      {/* ── Observations libres + voix ── */}
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Observations
          <span className="form-optional">optionnel</span>
          {hasSpeech && (
            <button
              type="button"
              className={`voice-btn ${listening ? 'voice-btn--active' : ''}`}
              onClick={toggleVoice}
              title={listening ? 'Arrêter la dictée' : 'Dicter par voix'}
              aria-label={listening ? 'Arrêter la dictée' : 'Dicter par voix'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              {listening && <span style={{ fontSize: 10 }}>En écoute…</span>}
            </button>
          )}
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
