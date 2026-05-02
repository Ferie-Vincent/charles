import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../../dashboard/api/get-dashboard';
import ProjectMap from '../components/ProjectMap';

type Filter = 'all' | 'green' | 'orange' | 'red';

const FILTER_OPTIONS: { value: Filter; label: string; color: string }[] = [
  { value: 'all',    label: 'Tous',     color: '#64748b' },
  { value: 'green',  label: 'Sains',    color: '#10b981' },
  { value: 'orange', label: 'Attention', color: '#f59e0b' },
  { value: 'red',    label: 'Critiques', color: '#ef4444' },
];

export default function MapPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    staleTime: 60_000,
  });
  const projects = data?.active_projects ?? [];

  const counts = {
    green:  projects.filter(p => p.health.status === 'green').length,
    orange: projects.filter(p => p.health.status === 'orange').length,
    red:    projects.filter(p => p.health.status === 'red').length,
  };

  return (
    <div className="map-page">
      <div className="map-page__header">
        <div>
          <h2 className="map-page__title">Carte des chantiers</h2>
          <p className="map-page__sub">{projects.filter(p => p.latitude && p.longitude).length} chantiers géolocalisés</p>
        </div>
        <div className="map-filter-bar">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`map-filter-btn ${filter === opt.value ? 'map-filter-btn--active' : ''}`}
              style={filter === opt.value ? { borderColor: opt.color, color: opt.color, background: `${opt.color}14` } : {}}
              onClick={() => setFilter(opt.value)}
            >
              {opt.value !== 'all' && (
                <span className="map-filter-btn__dot" style={{ background: opt.color }} />
              )}
              {opt.label}
              {opt.value !== 'all' && (
                <span className="map-filter-btn__count">{counts[opt.value as keyof typeof counts]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="map-card">
        {isLoading ? (
          <div className="map-loading">Chargement de la carte…</div>
        ) : (
          <ProjectMap projects={projects} filter={filter} />
        )}
      </div>

      <div className="map-legend">
        <span className="map-legend__item"><span className="map-legend__dot" style={{ background: '#10b981' }} /> Sain (≥75)</span>
        <span className="map-legend__item"><span className="map-legend__dot" style={{ background: '#f59e0b' }} /> Attention (50–74)</span>
        <span className="map-legend__item"><span className="map-legend__dot" style={{ background: '#ef4444' }} /> Critique (&lt;50)</span>
      </div>
    </div>
  );
}
