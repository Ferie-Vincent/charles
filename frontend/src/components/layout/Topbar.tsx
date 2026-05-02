import { Link } from 'react-router-dom';
import { logout } from '../../features/auth/api/login';
import { useAuth } from '../../features/auth/stores/auth-store';
import { getRoleGroup } from '../../lib/roles';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  async function handleLogout() {
    await logout();
    setUser(null);
    navigate('/login');
  }

  const canCreateProject = getRoleGroup(user?.role?.name ?? '') === 'direction';

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <header className="topbar">
      <div className="topbar-search">
        <svg className="topbar-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input aria-label="Rechercher" placeholder="Rechercher un chantier, DQE, intervenant…" />
      </div>

      <div className="topbar-actions">
        <div className="topbar-user" role="button" tabIndex={0}>
          <div className="topbar-avatar">{initials}</div>
          <div>
            <div className="topbar-username">{user?.company?.name ?? user?.name ?? ''}</div>
            <div className="topbar-role">{user?.role?.label ?? ''}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', marginLeft: 2 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        <div className="topbar-divider" />

        <button type="button" className="topbar-bell" aria-label="Notifications" onClick={() => {}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>

        {canCreateProject && (
          <Link to="/projects/new" className="btn-primary topbar-cta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouveau chantier
          </Link>
        )}

        <button type="button" className="topbar-logout" onClick={handleLogout} aria-label="Déconnexion" title="Déconnexion">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
