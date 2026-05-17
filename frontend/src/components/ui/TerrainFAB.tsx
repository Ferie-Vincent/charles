import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/stores/auth-store';
import { getRoleGroup } from '../../lib/roles';

interface Props {
  targetId: string;
  projectId?: number;
  onIncident?: () => void;
}

export default function TerrainFAB({ targetId, projectId, onIncident }: Props) {
  const { user } = useAuth();
  const group = getRoleGroup(user?.role?.name ?? '');
  const navigate = useNavigate();

  if (group !== 'terrain' && group !== 'conducteur') return null;

  function scrollToJournal() {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleIncident() {
    onIncident?.();
    const el = document.getElementById('incidents-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleAppro() {
    const url = projectId ? `/besoins?project=${projectId}` : '/besoins';
    navigate(url);
  }

  return (
    <div className="terrain-fab-group">
      {onIncident && (
        <button
          type="button"
          className="terrain-fab terrain-fab--incident"
          onClick={handleIncident}
          aria-label="Signaler un incident"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Incident</span>
        </button>
      )}
      <button
        type="button"
        className="terrain-fab terrain-fab--appro"
        onClick={handleAppro}
        aria-label="Demander matériaux"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <span>Matériaux</span>
      </button>
      <button
        type="button"
        className="terrain-fab"
        onClick={scrollToJournal}
        aria-label="Ajouter un rapport journal"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>Journal</span>
      </button>
    </div>
  );
}
