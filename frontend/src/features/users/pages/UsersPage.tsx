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

  return (
    <div>
      <PageHeader
        breadcrumb="ADMINISTRATION · 2026"
        title="Gestion des utilisateurs"
        subtitle="Créez, modifiez et supprimez les membres de votre équipe."
      />

      <div className="page-content">
        <div className="card card--full" style={{ marginTop: 0 }}>
          <div className="card-head" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="card-icon card-icon--purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>Équipe</h3>
                <p className="card-subtitle" style={{ margin: 0 }}>{users.length} membre{users.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button
              className="btn btn--primary"
              onClick={() => { setEditing(null); setShowModal(true); }}
            >
              + Nouvel utilisateur
            </button>
          </div>

          {loading ? (
            <p style={{ padding: '1.5rem', color: 'var(--color-text-muted)' }}>Chargement…</p>
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
                      <div className="table-actions">
                        <button
                          className="btn-icon btn-icon--edit"
                          title="Modifier"
                          onClick={() => { setEditing(u); setShowModal(true); }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className="btn-icon btn-icon--delete"
                          title="Supprimer"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
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
