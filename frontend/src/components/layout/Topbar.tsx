import { logout } from '../../features/auth/api/login';
import { useAuth } from '../../features/auth/stores/auth-store';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  async function handleLogout() {
    await logout();
    setUser(null);
    navigate('/login');
  }

  return (
    <header className="topbar">
      <input aria-label="Rechercher" placeholder="Rechercher un chantier…" />
      <div className="topbar-actions">
        <span className="topbar-user">{user?.name ?? ''}</span>
        <button type="button" onClick={handleLogout}>Déconnexion</button>
      </div>
    </header>
  );
}
