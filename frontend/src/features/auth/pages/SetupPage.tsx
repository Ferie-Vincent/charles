import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { useAuth } from '../stores/auth-store';

const SUPER_ADMIN_EMAIL = 'direction@charles.ci';

export default function SetupPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  // Redirige si déjà connecté
  if (user) return <Navigate to="/" replace />;

  // Vérifie si le setup est disponible
  useEffect(() => {
    api.get('/setup', { _silentOn403: true, _silentOn401: true } as never)
      .then(res => setAvailable(res.data.available))
      .catch(() => setAvailable(false));
  }, []);

  // Setup déjà fait → page de login
  if (available === false) return <Navigate to="/login" replace />;

  // Chargement initial
  if (available === null) {
    return (
      <div className="login-page">
        <div className="login-form-side" style={{ justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Vérification…</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setIsLoading(true);
    setError(undefined);
    try {
      const res = await api.post('/setup', {
        name,
        password,
        password_confirmation: passwordConfirmation,
      });
      setUser(res.data.user);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      if (msg?.includes('déjà configuré')) {
        navigate('/login');
      } else {
        setError(msg ?? 'Une erreur est survenue.');
      }
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
            Première<br />
            connexion <em>super-admin</em>
          </h1>
          <p className="login-panel__desc">
            Cette page n'est disponible qu'une seule fois, avant la création du premier compte administrateur.
          </p>
        </div>

        <div className="login-panel__stats">
          <div>
            <div className="login-panel__stat-value">1×</div>
            <div className="login-panel__stat-label">Utilisation unique</div>
          </div>
          <div>
            <div className="login-panel__stat-value">🔒</div>
            <div className="login-panel__stat-label">Accès sécurisé</div>
          </div>
          <div>
            <div className="login-panel__stat-value">direction</div>
            <div className="login-panel__stat-label">Rôle attribué</div>
          </div>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="login-form-side">
        <div className="login-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h1>Initialisation</h1>
        <p>Créez le compte administrateur principal</p>

        {/* Email fixe — non modifiable */}
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Email (fixe)</label>
          <input
            className="form-control"
            type="email"
            value={SUPER_ADMIN_EMAIL}
            readOnly
            style={{ background: 'var(--bg-muted, #f8fafc)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Nom complet</label>
            <input
              className="form-control"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex : Direction Charles"
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Mot de passe</label>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              required
              minLength={8}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Confirmer le mot de passe</label>
            <input
              className="form-control"
              type="password"
              value={passwordConfirmation}
              onChange={e => setPasswordConfirmation(e.target.value)}
              placeholder="Répétez le mot de passe"
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="form-error" style={{ marginBottom: '16px', color: 'var(--danger, #ef4444)', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={isLoading}
          >
            {isLoading ? 'Création en cours…' : 'Créer le compte administrateur'}
          </button>
        </form>
      </div>
    </div>
  );
}
