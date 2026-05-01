import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { login, type LoginPayload } from '../api/login';
import { useAuth } from '../stores/auth-store';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(payload: LoginPayload) {
    setIsLoading(true);
    setError(undefined);
    try {
      const data = await login(payload);
      setUser(data.user);
      navigate('/');
    } catch {
      setError('Identifiants incorrects. Vérifiez votre email et mot de passe.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Left panel — brand */}
      <div className="login-panel">
        <div className="login-panel__brand">
          <div className="login-panel__logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
              <line x1="12" y1="22" x2="12" y2="15.5"/>
              <polyline points="22 8.5 12 15.5 2 8.5"/>
            </svg>
          </div>
          <div>
            <div className="login-panel__name">Chantier Platform</div>
            <div className="login-panel__tagline">Gestion BTP</div>
          </div>
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
            <div className="login-panel__stat-value">7</div>
            <div className="login-panel__stat-label">Modules intégrés</div>
          </div>
          <div>
            <div className="login-panel__stat-value">FCFA</div>
            <div className="login-panel__stat-label">Multi-devises</div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-form-side">
        <h1>Connexion</h1>
        <p>Accédez à votre espace de gestion</p>
        <LoginForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
}
