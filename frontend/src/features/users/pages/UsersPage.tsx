import { useEffect, useState } from 'react';
import PageHeader from '../../../components/ui/PageHeader';
import UserModal from '../components/UserModal';
import {
  getUsers, createUser, updateUser, deleteUser,
  type AppUser, type UserPayload,
} from '../api/users';

const ROLE_COLOR: Record<string, string> = {
  'direction':           '#6366f1',
  'directeur-technique': '#8b5cf6',
  'conducteur-travaux':  '#0ea5e9',
  'chef-chantier':       '#10b981',
  'metreur-economiste':  '#f59e0b',
  'comptable':           '#f97316',
  'lecture-seule':       '#94a3b8',
};

export default function UsersPage() {
  const [users, setUsers]       = useState<AppUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    getUsers().then(setUsers).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleSave(payload: UserPayload & { password?: string }) {
    if (editing) {
      const updated = await updateUser(editing.id, payload);
      setUsers(u => u.map(x => x.id === updated.id ? updated : x));
    } else {
      const created = await createUser(payload as UserPayload & { password: string });
      setUsers(u => [...u, created]);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      setUsers(u => u.filter(x => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const directionCount    = users.filter(u => ['direction', 'directeur-technique'].includes(u.role.name)).length;
  const terrainCount      = users.filter(u => ['conducteur-travaux', 'chef-chantier'].includes(u.role.name)).length;
  const gestionCount      = users.filter(u => ['metreur-economiste', 'comptable'].includes(u.role.name)).length;
  const lectureCount      = users.filter(u => u.role.name === 'lecture-seule').length;

  return (
    <div>
      <PageHeader
        breadcrumb="ADMINISTRATION · 2026"
        title="Gestion des utilisateurs"
        subtitle="Créez, modifiez et supprimez les membres de votre équipe."
        action={
          <button
            className="btn-primary"
            onClick={() => { setEditing(null); setShowModal(true); }}
          >
            + Nouvel utilisateur
          </button>
        }
      />

      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{users.length}</div>
            <div className="proj-kpi__label">Total utilisateurs</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{directionCount}</div>
            <div className="proj-kpi__label">Direction / DT</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{terrainCount}</div>
            <div className="proj-kpi__label">Terrain (CT / CC)</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--teal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{gestionCount + lectureCount}</div>
            <div className="proj-kpi__label">Gestion / Lecture</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: '2rem', color: 'var(--text-muted)', textAlign: 'center' }}>Chargement…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun utilisateur</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="user-avatar-row">
                      <div
                        className="user-avatar"
                        style={{ background: ROLE_COLOR[u.role.name] ?? '#94a3b8' }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="user-name">{u.name}</span>
                    </div>
                  </td>
                  <td className="user-email">{u.email}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: (ROLE_COLOR[u.role.name] ?? '#94a3b8') + '22',
                        color: ROLE_COLOR[u.role.name] ?? '#94a3b8',
                        border: `1px solid ${ROLE_COLOR[u.role.name] ?? '#94a3b8'}44`,
                      }}
                    >
                      {u.role.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className="btn-icon btn-icon--edit"
                        title="Modifier"
                        onClick={() => { setEditing(u); setShowModal(true); }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        className="btn-icon btn-icon--delete"
                        title="Supprimer"
                        onClick={() => setDeleteTarget(u)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <UserModal
          user={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}

      {deleteTarget && (
        <div className="mr-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="mr-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Confirmer la suppression</h2>
              <button className="mr-modal__close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="mr-modal__body">
              <p style={{ margin: '0 0 1.5rem', color: 'var(--color-text-secondary)' }}>
                Supprimer <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) ? Cette action est irréversible.
              </p>
              <div className="mr-modal__actions">
                <button className="btn btn--secondary" onClick={() => setDeleteTarget(null)}>
                  Annuler
                </button>
                <button className="btn btn--danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
