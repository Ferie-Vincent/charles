import { useState } from 'react';
import { useAuth } from '../../auth/stores/auth-store';
import { updateProfile, changePassword, updateCompany } from '../api/profile';
import PageHeader from '../../../components/ui/PageHeader';

const ROLE_LABELS: Record<string, string> = {
  'direction':             'Direction Générale',
  'directeur-technique':   'Directeur Technique',
  'conducteur-travaux':    'Conducteur de Travaux',
  'chef-chantier':         'Chef de Chantier',
  'metreur-economiste':    'Métreur Économiste',
  'comptable':             'Comptable',
  'lecture-seule':         'Lecture Seule',
};

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  /* ── Profile form ── */
  const [profileForm, setProfileForm] = useState({
    name:  user?.name  ?? '',
    email: user?.email ?? '',
  });
  const [profileSaving, setProfileSaving]   = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError]     = useState('');

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess(false);
    try {
      const updated = await updateProfile(profileForm);
      if (updated) updateUser({ name: updated.name, email: updated.email });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Erreur lors de la mise à jour.';
      setProfileError(msg);
    } finally {
      setProfileSaving(false);
    }
  }

  /* ── Company form (direction only) ── */
  const isDirection = user?.role?.name === 'direction';
  const [companyName, setCompanyName]       = useState(user?.company?.name ?? '');
  const [companySaving, setCompanySaving]   = useState(false);
  const [companySuccess, setCompanySuccess] = useState(false);
  const [companyError, setCompanyError]     = useState('');

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    setCompanySaving(true);
    setCompanyError('');
    setCompanySuccess(false);
    try {
      const company = await updateCompany(companyName);
      updateUser({ company });
      setCompanySuccess(true);
      setTimeout(() => setCompanySuccess(false), 3000);
    } catch {
      setCompanyError('Erreur lors de la mise à jour.');
    } finally {
      setCompanySaving(false);
    }
  }

  /* ── Password form ── */
  const [pwForm, setPwForm] = useState({
    current_password:      '',
    password:              '',
    password_confirmation: '',
  });
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwErrors, setPwErrors]   = useState<Record<string, string>>({});

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwErrors({});
    if (pwForm.password !== pwForm.password_confirmation) {
      setPwErrors({ password_confirmation: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pwForm);
      setPwSuccess(true);
      setPwForm({ current_password: '', password: '', password_confirmation: '' });
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: unknown) {
      const errors = (err as { response?: { data?: { errors?: Record<string, string[]> } } })
        ?.response?.data?.errors ?? {};
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(errors)) flat[k] = Array.isArray(v) ? v[0] : String(v);
      if (Object.keys(flat).length === 0) flat['current_password'] = 'Erreur lors de la mise à jour.';
      setPwErrors(flat);
    } finally {
      setPwSaving(false);
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const roleLabel = user?.role?.name ? (ROLE_LABELS[user.role.name] ?? user.role.label) : '';

  return (
    <div>
      <PageHeader
        breadcrumb="MON COMPTE"
        title="Profil"
        subtitle="Gérez vos informations personnelles et votre mot de passe"
      />

      <div className="page-content" style={{ maxWidth: 720 }}>

        {/* ── Avatar card ── */}
        <div className="profile-card profile-card--avatar">
          <div className="profile-avatar profile-avatar--lg">{initials}</div>
          <div className="profile-avatar-info">
            <div className="profile-avatar-info__name">{user?.name}</div>
            <div className="profile-avatar-info__role">{roleLabel}</div>
            <div className="profile-avatar-info__company">{user?.company?.name}</div>
          </div>
          <div className="profile-avatar-badges">
            <span className="profile-role-badge">{user?.role?.name}</span>
          </div>
        </div>

        {/* ── Profile info form ── */}
        <div className="profile-card">
          <div className="profile-card__head">
            <div className="profile-card__head-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h2 className="profile-card__title">Informations personnelles</h2>
              <p className="profile-card__sub">Nom et adresse e-mail de connexion</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="profile-form">
            <div className="profile-form__grid">
              <div className="form-field">
                <label className="form-label" htmlFor="profile-name">Nom complet</label>
                <input
                  id="profile-name"
                  className="form-input"
                  value={profileForm.name}
                  onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Jean Dupont"
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="profile-email">Adresse e-mail</label>
                <input
                  id="profile-email"
                  className="form-input"
                  type="email"
                  value={profileForm.email}
                  onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Champs en lecture seule */}
            <div className="profile-form__grid">
              <div className="form-field">
                <label className="form-label">Rôle</label>
                <div className="form-input form-input--readonly">{roleLabel}</div>
              </div>
              <div className="form-field">
                <label className="form-label">Entreprise</label>
                <div className="form-input form-input--readonly">{user?.company?.name}</div>
              </div>
            </div>

            {profileError && <p className="form-error">{profileError}</p>}

            <div className="profile-form__footer">
              {profileSuccess && (
                <span className="profile-success-msg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                  Profil mis à jour
                </span>
              )}
              <button type="submit" className="btn btn--primary" disabled={profileSaving}>
                {profileSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Company form — direction only ── */}
        {isDirection && (
          <div className="profile-card">
            <div className="profile-card__head">
              <div className="profile-card__head-icon" style={{ background: '#F0FDF4', color: '#059669' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div>
                <h2 className="profile-card__title">Entreprise</h2>
                <p className="profile-card__sub">Nom affiché sur tous les documents et exports</p>
              </div>
            </div>
            <form onSubmit={handleCompanySubmit} className="profile-form">
              <div className="form-field">
                <label className="form-label" htmlFor="company-name">Nom de l'entreprise</label>
                <input
                  id="company-name"
                  className="form-input"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required
                />
              </div>
              {companyError && <p className="form-error">{companyError}</p>}
              <div className="profile-form__footer">
                {companySuccess && (
                  <span className="profile-success-msg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                    Entreprise mise à jour
                  </span>
                )}
                <button type="submit" className="btn btn--primary" disabled={companySaving}>
                  {companySaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Password form ── */}
        <div className="profile-card">
          <div className="profile-card__head">
            <div className="profile-card__head-icon profile-card__head-icon--teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h2 className="profile-card__title">Sécurité</h2>
              <p className="profile-card__sub">Changez votre mot de passe régulièrement</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="profile-form">
            <div className="form-field">
              <label className="form-label" htmlFor="pw-current">Mot de passe actuel</label>
              <input
                id="pw-current"
                className={`form-input ${pwErrors.current_password ? 'form-input--error' : ''}`}
                type="password"
                value={pwForm.current_password}
                onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                required
                autoComplete="current-password"
              />
              {pwErrors.current_password && <p className="form-error">{pwErrors.current_password}</p>}
            </div>

            <div className="profile-form__grid">
              <div className="form-field">
                <label className="form-label" htmlFor="pw-new">Nouveau mot de passe</label>
                <input
                  id="pw-new"
                  className={`form-input ${pwErrors.password ? 'form-input--error' : ''}`}
                  type="password"
                  value={pwForm.password}
                  onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                {pwErrors.password && <p className="form-error">{pwErrors.password}</p>}
                <p className="form-hint">Minimum 8 caractères</p>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="pw-confirm">Confirmer le mot de passe</label>
                <input
                  id="pw-confirm"
                  className={`form-input ${pwErrors.password_confirmation ? 'form-input--error' : ''}`}
                  type="password"
                  value={pwForm.password_confirmation}
                  onChange={e => setPwForm(f => ({ ...f, password_confirmation: e.target.value }))}
                  required
                  autoComplete="new-password"
                />
                {pwErrors.password_confirmation && <p className="form-error">{pwErrors.password_confirmation}</p>}
              </div>
            </div>

            {/* Indicateur de force */}
            {pwForm.password && (
              <PasswordStrength password={pwForm.password} />
            )}

            <div className="profile-form__footer">
              {pwSuccess && (
                <span className="profile-success-msg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                  Mot de passe mis à jour
                </span>
              )}
              <button type="submit" className="btn btn--primary" disabled={pwSaving}>
                {pwSaving ? 'Mise à jour…' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

/* ── Password strength indicator ── */
function PasswordStrength({ password }: { password: string }) {
  const score = getStrength(password);
  const levels = [
    { label: 'Très faible', color: '#ef4444' },
    { label: 'Faible',      color: '#f97316' },
    { label: 'Moyen',       color: '#f59e0b' },
    { label: 'Fort',        color: '#10b981' },
    { label: 'Très fort',   color: '#059669' },
  ];
  const { label, color } = levels[score];
  return (
    <div className="pw-strength">
      <div className="pw-strength__bars">
        {levels.map((_, i) => (
          <div
            key={i}
            className="pw-strength__bar"
            style={{ background: i <= score ? color : '#e2e8f0' }}
          />
        ))}
      </div>
      <span className="pw-strength__label" style={{ color }}>{label}</span>
    </div>
  );
}

function getStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}
