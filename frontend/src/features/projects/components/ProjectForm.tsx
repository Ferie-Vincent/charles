import { useState } from 'react';
import type { CreateProjectPayload, TypeMarche } from '../types';

type ProjectFormProps = {
  onSubmit: (payload: CreateProjectPayload) => void;
  isLoading?: boolean;
};

const TYPE_MARCHE_OPTIONS: { value: TypeMarche; label: string }[] = [
  { value: 'forfait',             label: 'Marché à forfait' },
  { value: 'bordereau_prix',      label: 'Bordereau de prix unitaires' },
  { value: 'depenses_controlees', label: 'Dépenses contrôlées (régie)' },
  { value: 'cle_en_main',         label: 'Clé en main (EPC)' },
];

export default function ProjectForm({ onSubmit, isLoading }: ProjectFormProps) {
  const [code, setCode]         = useState('');
  const [name, setName]         = useState('');
  const [status, setStatus]     = useState('en_preparation');
  const [location, setLocation] = useState('');
  const [budget, setBudget]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [latitude, setLatitude]   = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  // Champs contractuels BTP
  const [typeMarche, setTypeMarche]             = useState<TypeMarche | ''>('');
  const [maitreOuvrage, setMaitreOuvrage]       = useState('');
  const [maitreOeuvre, setMaitreOeuvre]         = useState('');
  const [bureauControle, setBureauControle]     = useState('');
  const [montantMarche, setMontantMarche]       = useState('');
  const [avancePct, setAvancePct]               = useState('');
  const [delaiJours, setDelaiJours]             = useState('');

  function mapZone() {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGeoStatus('ok');
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form
      className="project-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          code,
          name,
          status,
          location: location || undefined,
          budget_amount:         budget ? Number(budget) : undefined,
          start_date:            startDate || undefined,
          end_date:              endDate || undefined,
          type_marche:           typeMarche || undefined,
          maitre_ouvrage:        maitreOuvrage || undefined,
          maitre_oeuvre:         maitreOeuvre || undefined,
          bureau_controle:       bureauControle || undefined,
          montant_marche:        montantMarche ? Number(montantMarche) : undefined,
          avance_demarrage_pct:  avancePct ? Number(avancePct) : undefined,
          delai_execution_jours: delaiJours ? Number(delaiJours) : undefined,
          latitude:              latitude ?? undefined,
          longitude:             longitude ?? undefined,
        });
      }}
    >
      {/* ── Identité du chantier ── */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="code">Code chantier *</label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="CH-ABJ-2026-001" />
        </div>
        <div className="form-group">
          <label htmlFor="status">Statut *</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="en_preparation">En préparation</option>
            <option value="active">Actif</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="name">Nom du chantier *</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Construction immeuble R+4 – Yopougon" />
      </div>

      <div className="form-group">
        <label htmlFor="location">Localisation</label>
        <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Abidjan, Yopougon Selmer" />
      </div>

      <div className="form-group">
        <label>Zone GPS du chantier <span style={{ color: '#ef4444' }}>*</span></label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--secondary btn--sm" onClick={mapZone} disabled={geoStatus === 'loading'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
            </svg>
            {geoStatus === 'loading' ? 'Localisation…' : 'Mapper la zone du chantier'}
          </button>
          {geoStatus === 'ok' && latitude !== null && longitude !== null && (
            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 500 }}>
              Zone enregistrée — {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </span>
          )}
          {geoStatus === 'error' && (
            <span style={{ fontSize: '12px', color: '#ef4444' }}>
              Impossible de récupérer la position. Vérifiez les permissions GPS.
            </span>
          )}
        </div>
        <span className="form-hint">
          Le chef chantier devra être dans un rayon de 2 km pour remplir le journal terrain.
        </span>
      </div>

      {/* ── Données financières ── */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="budget">Budget prévisionnel (FCFA HT)</label>
          <input id="budget" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="montant_marche">Montant du marché signé (FCFA HT)</label>
          <input id="montant_marche" type="number" min="0" value={montantMarche} onChange={(e) => setMontantMarche(e.target.value)} />
        </div>
      </div>

      {/* ── Calendrier contractuel ── */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="start_date">Date de début</label>
          <input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="end_date">Date de fin contractuelle</label>
          <input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="delai_jours">Délai d'exécution (jours)</label>
          <input id="delai_jours" type="number" min="1" value={delaiJours} onChange={(e) => setDelaiJours(e.target.value)} placeholder="180" />
        </div>
      </div>

      {/* ── Marché BTP ── */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="type_marche">Type de marché</label>
          <select id="type_marche" value={typeMarche} onChange={(e) => setTypeMarche(e.target.value as TypeMarche | '')}>
            <option value="">— Sélectionner —</option>
            {TYPE_MARCHE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="avance_pct">Avance de démarrage (%)</label>
          <input id="avance_pct" type="number" min="0" max="50" value={avancePct} onChange={(e) => setAvancePct(e.target.value)} placeholder="15" />
        </div>
      </div>

      {/* ── Intervenants ── */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="maitre_ouvrage">Maître d'ouvrage (client)</label>
          <input id="maitre_ouvrage" value={maitreOuvrage} onChange={(e) => setMaitreOuvrage(e.target.value)} placeholder="SICOGI, Ministère, Particulier…" />
        </div>
        <div className="form-group">
          <label htmlFor="maitre_oeuvre">Maître d'œuvre / BET</label>
          <input id="maitre_oeuvre" value={maitreOeuvre} onChange={(e) => setMaitreOeuvre(e.target.value)} placeholder="Cabinet d'architecture, BET…" />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="bureau_controle">Bureau de contrôle technique</label>
        <input id="bureau_controle" value={bureauControle} onChange={(e) => setBureauControle(e.target.value)} placeholder="SOCOTEC CI, BUREAU VERITAS, APAVE…" />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Enregistrement…' : 'Créer le chantier'}
      </button>
    </form>
  );
}
