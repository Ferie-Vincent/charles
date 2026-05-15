import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import L from 'leaflet';
import type { ActiveProject, ProjectHealth } from '../api/get-dashboard';

export type MapViewHandle = { invalidateSize: () => void };

const CI_CENTER: [number, number] = [7.54, -5.55];
const CI_ZOOM = 7;

const HEALTH_COLOR: Record<ProjectHealth['status'], string> = {
  green:  '#059669',
  orange: '#ea580c',
  red:    '#dc2626',
};

const PROJECT_ICON: Record<string, string> = {
  villa:      'fa-house',
  duplex:     'fa-house',
  résidence:  'fa-house',
  immeuble:   'fa-building',
  tour:       'fa-building',
  hôtel:      'fa-hotel',
  complexe:   'fa-dumbbell',
  école:      'fa-school',
  lycée:      'fa-school',
  clinique:   'fa-hospital',
  santé:      'fa-hospital',
  entrepôt:   'fa-warehouse',
  station:    'fa-gas-pump',
  salle:      'fa-landmark',
  pont:       'fa-road',
  voirie:     'fa-road',
  réfection:  'fa-wrench',
};

type FilterStatus = ProjectHealth['status'] | 'all';

const FILTER_OPTIONS: { value: FilterStatus; label: string; icon: string }[] = [
  { value: 'all',    label: 'Tous',      icon: '🗺️'  },
  { value: 'green',  label: 'Sain',      icon: '🟢'  },
  { value: 'orange', label: 'Attention', icon: '🟠'  },
  { value: 'red',    label: 'Critique',  icon: '🔴'  },
];

function getIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(PROJECT_ICON)) {
    if (lower.includes(key)) return icon;
  }
  return 'fa-hard-hat';
}

function makeMarker(project: ActiveProject): L.Marker {
  const color  = HEALTH_COLOR[project.health.status];
  const faIcon = getIcon(project.name);

  const divIcon = L.divIcon({
    className: '',
    html: `
      <div class="map-pin" style="--pin-color:${color}">
        <i class="fas ${faIcon}"></i>
        <span>${project.health.score}</span>
      </div>
    `,
    iconSize:    [44, 52],
    iconAnchor:  [22, 52],
    popupAnchor: [0, -54],
  });

  const marker = L.marker([project.latitude!, project.longitude!], { icon: divIcon });
  marker.bindPopup(`
    <div class="map-popup">
      <div class="map-popup__name">${project.name}</div>
      <div class="map-popup__code">${project.code}</div>
      ${project.location ? `<div class="map-popup__loc">${project.location}</div>` : ''}
      <a class="map-popup__link" href="/projects/${project.id}" onclick="window.location.href='/projects/${project.id}';return false;">Voir le chantier →</a>
    </div>
  `, { minWidth: 220, maxWidth: 300 });
  return marker;
}

type Props = { projects: ActiveProject[] };

const MapView = forwardRef<MapViewHandle, Props>(function MapView({ projects }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');

  useImperativeHandle(ref, () => ({
    invalidateSize: () => { mapRef.current?.invalidateSize(); },
  }));

  const mappable = projects.filter(p => p.latitude != null && p.longitude != null);
  const visible  = filter === 'all' ? mappable : mappable.filter(p => p.health.status === filter);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current, {
      center: CI_CENTER,
      zoom:   CI_ZOOM,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(mapRef.current);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.eachLayer(layer => {
      if (layer instanceof L.Marker) mapRef.current!.removeLayer(layer);
    });
    visible.forEach(p => makeMarker(p).addTo(mapRef.current!));
  }, [visible]);

  const counts = {
    all:    mappable.length,
    green:  mappable.filter(p => p.health.status === 'green').length,
    orange: mappable.filter(p => p.health.status === 'orange').length,
    red:    mappable.filter(p => p.health.status === 'red').length,
  };

  return (
    <div className="map-wrap">
      <div className="map-filters">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`map-filter-btn ${filter === opt.value ? 'map-filter-btn--active' : ''}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.icon} {opt.label}
            <span className="map-filter-count">{counts[opt.value]}</span>
          </button>
        ))}
      </div>

      <div ref={containerRef} className="map-container" />

      <div className="map-legend">
        <span>🟢 Sain ≥ 75</span>
        <span>🟠 Attention 50–74</span>
        <span>🔴 Critique &lt; 50</span>
        <span className="map-legend-sep">·</span>
        <span>{visible.length} chantier{visible.length > 1 ? 's' : ''} affiché{visible.length > 1 ? 's' : ''}</span>
      </div>
    </div>
  );
});

export default MapView;
