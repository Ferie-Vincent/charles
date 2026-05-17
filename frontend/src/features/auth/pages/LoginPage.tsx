import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { login, type LoginPayload } from '../api/login';
import { useAuth } from '../stores/auth-store';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(payload: LoginPayload) {
    setIsLoading(true);
    setError(undefined);
    try {
      const data = await login(payload);
      setUser(data.user);
      navigate(data.user.must_change_password ? '/change-password' : '/');
    } catch {
      setError('Identifiants incorrects. Vérifiez votre email et mot de passe.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Panneau gauche — marque */}
      <div className="login-panel">
        <div className="login-panel__brand">
          <img src="/charles.png" alt="Charles" className="login-panel__logo-img" />
          <span className="login-panel__mobile-tag">Gestion chantiers</span>
        </div>

        <div className="login-panel__content">
          <h1 className="login-panel__headline">
            Pilotez vos<br />
            chantiers <em>en temps réel</em>
          </h1>
          <p className="login-panel__desc">
            Suivi avancement, DQE automatisé, contrôle budgétaire et reporting QSE — tout depuis une seule plateforme.
          </p>
        </div>

        <div className="login-panel__stats">
          <div>
            <div className="login-panel__stat-value">100%</div>
            <div className="login-panel__stat-label">Données sécurisées</div>
          </div>
          <div>
            <div className="login-panel__stat-value">15+</div>
            <div className="login-panel__stat-label">Modules intégrés</div>
          </div>
          <div>
            <div className="login-panel__stat-value">FCFA</div>
            <div className="login-panel__stat-label">Multi-devises</div>
          </div>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="login-form-side">
        <div className="login-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h1>Connexion</h1>
        <p>Accédez à votre espace de gestion</p>
        <LoginForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
          <Link to="/forgot-password" style={{ color: 'var(--color-text-muted)' }}>
            Mot de passe oublié ?
          </Link>
        </p>
      </div>
    </div>
  );
}
