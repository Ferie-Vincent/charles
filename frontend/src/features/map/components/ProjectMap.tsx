import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import type { ActiveProject } from '../../dashboard/api/get-dashboard';

const HEALTH_COLOR: Record<string, string> = {
  green:  '#10b981',
  orange: '#f59e0b',
  red:    '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', active: 'Actif', completed: 'Terminé', archived: 'Archivé',
};

function makeIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:32px; height:32px;
        background:${color};
        border:3px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

function FitBounds({ projects }: { projects: ActiveProject[] }) {
  const map = useMap();
  useEffect(() => {
    const points = projects
      .filter(p => p.latitude && p.longitude)
      .map(p => [p.latitude!, p.longitude!] as [number, number]);
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 12 });
    }
  }, [map, projects]);
  return null;
}

type Props = {
  projects: ActiveProject[];
  filter: 'all' | 'green' | 'orange' | 'red';
};

export default function ProjectMap({ projects, filter }: Props) {
  const visible = projects.filter(p => {
    if (!p.latitude || !p.longitude) return false;
    if (filter === 'all') return true;
    return p.health.status === filter;
  });

  return (
    <MapContainer
      center={[7.54, -5.55]}
      zoom={7}
      style={{ width: '100%', height: '100%', borderRadius: '0 0 12px 12px' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds projects={visible} />
      {visible.map(project => {
        const color = HEALTH_COLOR[project.health.status] ?? '#94a3b8';
        return (
          <Marker
            key={project.id}
            position={[project.latitude!, project.longitude!]}
            icon={makeIcon(color)}
          >
            <Popup minWidth={240} maxWidth={280}>
              <div style={{ fontFamily: 'system-ui,sans-serif', fontSize: 13, lineHeight: 1.4, margin: -1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 6px', borderBottom: `2px solid ${color}`, gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const }}>{project.code}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color, background: `${color}18`, borderRadius: 10, padding: '1px 7px', flexShrink: 0 }}>{STATUS_LABELS[project.status] ?? project.status}</span>
                </div>
                <div style={{ padding: '8px 12px 4px' }}>
                  <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{project.name}</p>
                  {project.location && <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94a3b8' }}>{project.location}</p>}
                  <div style={{ fontSize: 12, color, fontWeight: 600 }}>Score santé : {project.health.score}/100</div>
                </div>
                <Link to={`/projects/${project.id}`} style={{ display: 'block', padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#f97316', textDecoration: 'none', borderTop: '1px solid #e2e8f0', background: '#fafafa', borderRadius: '0 0 6px 6px' }}>
                  Ouvrir le chantier →
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
