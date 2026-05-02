import { useAuth } from '../../features/auth/stores/auth-store';
import { getRoleGroup } from '../../lib/roles';

interface Props {
  targetId: string;
}

export default function TerrainFAB({ targetId }: Props) {
  const { user } = useAuth();
  const group = getRoleGroup(user?.role?.name ?? '');

  if (group !== 'terrain') return null;

  function scrollToJournal() {
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
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
  );
}
