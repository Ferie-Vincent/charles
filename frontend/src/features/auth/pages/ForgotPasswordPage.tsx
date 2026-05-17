import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email }, { _silentOn401: true } as object);
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Erreur lors de l\'envoi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-panel__brand">
          <img src="/charles.png" alt="Charles" className="login-panel__logo-img" />
        </div>
        <div className="login-panel__content">
          <h1 className="login-panel__headline">
            Réinitialiser<br />
            <em>votre mot de passe</em>
          </h1>
          <p className="login-panel__desc">
            Entrez votre adresse email — un lien de réinitialisation vous sera envoyé.
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

        {sent ? (
          <>
            <h1>Email envoyé</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Si un compte existe pour <strong>{email}</strong>, un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.
            </p>
            <Link to="/login" className="btn btn--secondary">
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <h1>Mot de passe oublié ?</h1>
            <p>Renseignez votre email pour recevoir un lien de réinitialisation</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
              <div className="form-field">
                <label className="form-label">Adresse email</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  autoFocus
                />
              </div>

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="btn btn--primary" disabled={loading}>
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>

              <Link to="/login" style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                Retour à la connexion
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
