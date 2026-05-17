import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import { useAuth } from '../stores/auth-store';

export default function SetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [invalid, setInvalid]         = useState(false);

  useEffect(() => {
    api.get(`/auth/invitation/${token}`, { _silentOn401: true })
      .then(res => {
        setName(res.data.name);
        setEmail(res.data.email);
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post(`/auth/invitation/${token}`, {
        password,
        password_confirmation: confirm,
      });
      setUser(res.data.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      if (msg?.errors) {
        setError(Object.values(msg.errors).flat().join(' '));
      } else {
        setError(msg?.message ?? 'Erreur lors de la définition du mot de passe.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="login-page" style={{ justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Vérification du lien…</p>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="login-page" style={{ justifyContent: 'center' }}>
        <div className="login-form-side" style={{ maxWidth: 440 }}>
          <div className="login-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h1>Lien invalide</h1>
          <p>Ce lien d'invitation est expiré ou déjà utilisé.</p>
          <a href="/login" className="btn btn--primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-panel__brand">
          <img src="/charles.png" alt="Charles" className="login-panel__logo-img" />
        </div>
        <div className="login-panel__content">
          <h1 className="login-panel__headline">
            Bienvenue sur<br />
            <em>Charles</em>
          </h1>
          <p className="login-panel__desc">
            Définissez votre mot de passe pour accéder à la plateforme de gestion de chantiers.
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
        <h1>Définir mon mot de passe</h1>
        <p>Bonjour <strong>{name}</strong> — compte : {email}</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <div className="form-field">
            <label className="form-label">Mot de passe</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min. 8 caractères"
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
