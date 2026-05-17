import { useState, useRef, useEffect } from 'react';
import type { ActiveProject } from '../api/get-dashboard';
import MapView, { type MapViewHandle } from './MapView';
import TimelineView from './TimelineView';

type Tab = 'carte' | 'chronologie';

type Props = {
  projects: ActiveProject[];
  /** Masquer l'onglet Chronologie pour les rôles qui n'ont pas besoin de visibilité planning (ex. terrain) */
  showTimeline?: boolean;
};

export default function PortfolioPanel({ projects, showTimeline = true }: Props) {
  const [tab, setTab] = useState<Tab>('carte');
  const mapRef = useRef<MapViewHandle>(null);

  useEffect(() => {
    if (tab === 'carte') {
      // requestAnimationFrame garantit qu'on est après le rendu navigateur,
      // donc le conteneur de carte a des dimensions réelles lors de l'appel à invalidateSize.
      requestAnimationFrame(() => { mapRef.current?.invalidateSize(); });
    }
  }, [tab]);

  return (
    <div className="card card--full" style={{ marginBottom: '1.5rem' }}>
      <div className="card-head">
        <div className="card-icon card-icon--teal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </div>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Vue portefeuille</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>
            {showTimeline ? 'Carte et chronologie des chantiers actifs' : 'Carte des chantiers actifs'}
          </p>
        </div>
        {showTimeline && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`bud-tab ${tab === 'carte' ? 'bud-tab--active' : ''}`}
              onClick={() => setTab('carte')}
            >
              🗺️ Carte
            </button>
            <button
              type="button"
              className={`bud-tab ${tab === 'chronologie' ? 'bud-tab--active' : ''}`}
              onClick={() => setTab('chronologie')}
            >
              📅 Chronologie
            </button>
          </div>
        )}
      </div>

      {/*
        Les deux panneaux restent montés — démonter Leaflet fait perdre le cache des tuiles et la position de la carte.
        La bascule CSS display + invalidateSize() impératif via requestAnimationFrame
        restaure les dimensions de la carte quand le panneau redevient visible.
      */}
      <div style={{ display: tab === 'carte' ? 'block' : 'none' }}>
        <MapView ref={mapRef} projects={projects} />
      </div>
      {showTimeline && (
        <div style={{ display: tab === 'chronologie' ? 'block' : 'none' }}>
          <TimelineView projects={projects} />
        </div>
      )}
    </div>
  );
}
