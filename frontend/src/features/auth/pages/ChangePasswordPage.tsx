import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';
import { useAuth } from '../stores/auth-store';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.put('/profile/force-password', { password, password_confirmation: confirm });
      updateUser({ must_change_password: false });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      if (msg?.errors) {
        setError(Object.values(msg.errors).flat().join(' '));
      } else {
        setError(msg?.message ?? 'Erreur lors du changement de mot de passe.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-panel__brand">
          <img src="/heleman.png" alt="Helaman Expertise" className="login-panel__logo-img" />
        </div>
        <div className="login-panel__content">
          <h1 className="login-panel__headline">
            Première connexion —<br />
            <em>définissez votre mot de passe</em>
          </h1>
          <p className="login-panel__desc">
            Pour des raisons de sécurité, vous devez définir un mot de passe personnel avant d'accéder à la plateforme.
          </p>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h1>Changer mon mot de passe</h1>
        <p>Bonjour <strong>{user?.name}</strong> — choisissez un mot de passe sécurisé</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <div className="form-field">
            <label className="form-label">Nouveau mot de passe</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min. 8 caractères"
              autoFocus
            />
          </div>

          <div className="form-field">
            <label className="form-label">Confirmer le mot de passe</label>
            <input
              className="form-input"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
              placeholder="Répétez le mot de passe"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn--primary" disabled={submitting} style={{ marginTop: '0.5rem' }}>
            {submitting ? 'Enregistrement…' : 'Accéder à la plateforme'}
          </button>
        </form>
      </div>
    </div>
  );
}
