import { useEffect, useState } from 'react';
import { createUser, getRoles, updateUser, type AppUser, type Role, type UserPayload } from '../api/users';

interface Props {
  user: AppUser | null;
  onSaved: (user: AppUser) => void;
  onClose: () => void;
}

const ROLE_GROUP_ORDER = [
  'direction', 'directeur-technique', 'conducteur-travaux',
  'chef-chantier', 'metreur-economiste', 'comptable', 'lecture-seule',
];

export default function UserModal({ user, onSaved, onClose }: Props) {
  const isEdit = user !== null;

  const [roles, setRoles]             = useState<Role[]>([]);
  const [name, setName]               = useState(user?.name ?? '');
  const [email, setEmail]             = useState(user?.email ?? '');
  const [roleId, setRoleId]           = useState<number>(user?.role.id ?? 0);
  const [password, setPassword]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    getRoles().then(r => {
      const sorted = [...r].sort(
        (a, b) => ROLE_GROUP_ORDER.indexOf(a.name) - ROLE_GROUP_ORDER.indexOf(b.name)
      );
      setRoles(sorted);
      if (!isEdit && sorted.length > 0 && roleId === 0) {
        setRoleId(sorted[0].id);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!roleId) { setError('Sélectionner un rôle'); return; }

    setLoading(true);
    try {
      if (isEdit) {
        const payload: UserPayload & { password?: string } = { name, email, role_id: roleId };
        if (password) payload.password = password;
        const updated = await updateUser(user.id, payload);
        onSaved(updated);
        onClose();
      } else {
        const created = await createUser({ name, email, role_id: roleId });
        onSaved(created);
        setInvitationUrl(created.invitation_url);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
        ?.response?.data;
      if (msg?.errors) {
        setError(Object.values(msg.errors).flat().join(' '));
      } else {
        setError(msg?.message ?? 'Erreur');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!invitationUrl) return;
    navigator.clipboard.writeText(invitationUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (invitationUrl) {
    return (
      <div className="mr-modal-overlay" onClick={onClose}>
        <div className="mr-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
          <div className="mr-modal__head">
            <h2 className="mr-modal__title">Utilisateur créé</h2>
            <button className="mr-modal__close" aria-label="Fermer" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Un email d'invitation a été envoyé à <strong>{email}</strong>. Vous pouvez aussi partager ce lien directement :
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                className="form-input"
                readOnly
                value={invitationUrl}
                style={{ flex: 1, fontSize: '0.75rem', fontFamily: 'monospace' }}
              />
              <button type="button" className="btn btn--secondary" onClick={handleCopy} style={{ whiteSpace: 'nowrap' }}>
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
              Ce lien expire dans 7 jours.
            </p>
            <div className="mr-modal__actions">
              <button type="button" className="btn btn--primary" onClick={onClose}>Fermer</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mr-modal-overlay" onClick={onClose}>
      <div className="mr-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="mr-modal__head">
          <h2 className="mr-modal__title">
            {isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
          </h2>
          <button className="mr-modal__close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-field">
            <label className="form-label">Nom complet</label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Ex: Konan Koffi"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="utilisateur@charles.ci"
              disabled={isEdit}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Rôle</label>
            <select
              className="form-select"
              value={roleId}
              onChange={e => setRoleId(Number(e.target.value))}
              required
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>

          {isEdit && (
            <div className="form-field">
              <label className="form-label">
                Nouveau mot de passe{' '}
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(laisser vide = inchangé)</span>
              </label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
              />
            </div>
          )}

          {!isEdit && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
              Un email d'invitation sera envoyé automatiquement. L'utilisateur définira son mot de passe via le lien.
            </p>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="mr-modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer & inviter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
