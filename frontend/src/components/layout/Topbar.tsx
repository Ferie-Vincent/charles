import { authState, clearAuthUser } from '../../features/auth/stores/auth-store';
import { logout } from '../../features/auth/api/login';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    clearAuthUser();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <input aria-label="Rechercher" placeholder="Rechercher un chantier…" />
      <div className="topbar-actions">
        <span className="topbar-user">{authState.user?.name ?? ''}</span>
        <button type="button" onClick={handleLogout}>Déconnexion</button>
      </div>
    </header>
  );
}
