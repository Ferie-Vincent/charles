import { useState, useRef, useEffect } from 'react';
import type { ActiveProject } from '../api/get-dashboard';
import MapView, { type MapViewHandle } from './MapView';
import TimelineView from './TimelineView';

type Tab = 'carte' | 'chronologie';

type Props = {
  projects: ActiveProject[];
  /** Hide the Chronologie tab for roles that don't need planning visibility (e.g. terrain) */
  showTimeline?: boolean;
};

export default function PortfolioPanel({ projects, showTimeline = true }: Props) {
  const [tab, setTab] = useState<Tab>('carte');
  const mapRef = useRef<MapViewHandle>(null);

  useEffect(() => {
    if (tab === 'carte') {
      // requestAnimationFrame guarantees we're after browser layout,
      // so the map container has real dimensions when invalidateSize runs.
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
        Both panes stay mounted — unmounting Leaflet loses tile cache and map position.
        CSS display toggle + imperative invalidateSize() via requestAnimationFrame
        restores map dimensions when the pane becomes visible.
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
