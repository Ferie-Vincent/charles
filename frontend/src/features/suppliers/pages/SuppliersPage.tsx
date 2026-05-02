import { useEffect, useState } from 'react';
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  SUPPLIER_CATEGORIES, type GlobalSupplier,
} from '../api/suppliers';
import PageHeader from '../../../components/ui/PageHeader';

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M` :
  n >= 1_000     ? `${(n / 1_000).toFixed(0)} k` :
  `${n.toFixed(0)}`;

const EMPTY: Partial<GlobalSupplier> = {
  name: '', category: 'fournitures', contact_name: '', phone: '', email: '',
  contract_amount: 0, notes: '',
};

const CAT_COLOR: Record<string, string> = {
  travaux:          '#3b7ddd',
  fournitures:      '#f59e0b',
  services:         '#8b5cf6',
  'sous-traitance': '#10b981',
  location:         '#f97316',
};

const CAT_BADGE: Record<string, string> = {
  travaux:          'badge',
  fournitures:      'badge badge-draft',
  services:         'badge',
  'sous-traitance': 'badge badge-active',
  location:         'badge',
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers]   = useState<GlobalSupplier[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [modal, setModal]           = useState<Partial<GlobalSupplier> | null>(null);
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const load = () => {
    setLoading(true);
    getSuppliers()
      .then(setSuppliers)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = suppliers.filter(s => {
    const matchQ   = !search   || s.name.toLowerCase().includes(search.toLowerCase()) || (s.contact_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || s.category === catFilter;
    return matchQ && matchCat;
  });

  const totalFacturé  = suppliers.reduce((s, sup) => s + (sup.invoices_sum_amount_ht ?? 0), 0);
  const totalContrats = suppliers.reduce((s, sup) => s + (sup.contract_amount ?? 0), 0);
  const actifs        = suppliers.filter(s => (s.invoices_count ?? 0) > 0).length;

  const handleSave = async () => {
    if (!modal || !modal.name) return;
    setSaving(true);
    try {
      if (modal.id) await updateSupplier(modal.id, modal);
      else          await createSupplier(modal);
      setModal(null);
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteError('');
    try {
      await deleteSupplier(deleteId);
      setDeleteId(null);
      load();
    } catch {
      setDeleteError('Ce fournisseur a des factures associées — impossible de le supprimer.');
    }
  };

  return (
    <div>
      <PageHeader
        title="Base Fournisseurs"
        subtitle="Annuaire centralisé — partagé par tous les chantiers"
        action={
          <button className="btn-primary" onClick={() => setModal({ ...EMPTY })}>
            + Nouveau fournisseur
          </button>
        }
      />

      {/* KPI strip */}
      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{suppliers.length}</div>
            <div className="proj-kpi__label">Fournisseurs</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{actifs}</div>
            <div className="proj-kpi__label">Actifs (avec factures)</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmt(totalFacturé)} FCFA</div>
            <div className="proj-kpi__label">Total facturé</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--teal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmt(totalContrats)} FCFA</div>
            <div className="proj-kpi__label">Total montants contrats</div>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div className="acct-search-wrap" style={{ flex: '0 0 280px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="acct-search-icon">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="acct-search-input"
              placeholder="Rechercher un fournisseur…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="acct-search-clear" onClick={() => setSearch('')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className={`bud-tab${!catFilter ? ' bud-tab--active' : ''}`} onClick={() => setCatFilter('')}>
              Tous <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, background: !catFilter ? 'rgba(255,255,255,0.2)' : 'var(--border)', color: !catFilter ? 'inherit' : 'var(--text-muted)', borderRadius: 4, padding: '1px 5px' }}>{suppliers.length}</span>
            </button>
            {Object.entries(SUPPLIER_CATEGORIES).map(([k, v]) => {
              const count = suppliers.filter(s => s.category === k).length;
              if (!count) return null;
              return (
                <button key={k} className={`bud-tab${catFilter === k ? ' bud-tab--active' : ''}`} onClick={() => setCatFilter(k === catFilter ? '' : k)}>
                  {v} <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, background: catFilter === k ? 'rgba(255,255,255,0.2)' : 'var(--border)', color: catFilter === k ? 'inherit' : 'var(--text-muted)', borderRadius: 4, padding: '1px 5px' }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <p style={{ padding: '2rem', color: 'var(--text-muted)', textAlign: 'center' }}>Chargement…</p>
        ) : (
          <table className="data-table supp-table">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Catégorie</th>
                <th>Contact</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th style={{ textAlign: 'right' }}>Montant contrat</th>
                <th style={{ textAlign: 'right' }}>Factures</th>
                <th style={{ textAlign: 'right' }}>Total facturé</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {search || catFilter ? 'Aucun fournisseur pour ce filtre' : 'Aucun fournisseur — créez-en un'}
                </td></tr>
              )}
              {filtered.map(s => {
                const cc = CAT_COLOR[s.category] ?? '#94a3b8';
                return (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      {s.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes}</p>}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `${cc}12`, color: cc, border: `1px solid ${cc}35` }}>
                        {SUPPLIER_CATEGORIES[s.category] ?? s.category}
                      </span>
                    </td>
                    <td>{s.contact_name || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{s.phone || '—'}</td>
                    <td>
                      {s.email
                        ? <a href={`mailto:${s.email}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13 }}>{s.email}</a>
                        : '—'
                      }
                    </td>
                    <td style={{ textAlign: 'right' }}>{s.contract_amount ? `${fmt(s.contract_amount)} FCFA` : '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        minWidth: 24,
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        background: (s.invoices_count ?? 0) > 0 ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--border)',
                        color: (s.invoices_count ?? 0) > 0 ? 'var(--accent)' : 'var(--text-muted)',
                      }}>
                        {s.invoices_count ?? 0}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {(s.invoices_sum_amount_ht ?? 0) > 0 ? `${fmt(s.invoices_sum_amount_ht!)} FCFA` : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon btn-icon--edit" onClick={() => setModal({ ...s })}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon btn-icon--delete" onClick={() => { setDeleteId(s.id); setDeleteError(''); }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Supplier modal */}
      {modal !== null && (
        <div className="mr-modal-overlay" onClick={() => setModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">{modal.id ? 'Modifier fournisseur' : 'Nouveau fournisseur'}</h2>
              <button className="mr-modal__close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Nom *</label>
                  <input className="form-input" value={modal.name ?? ''} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="Raison sociale ou nom" required />
                </div>
                <div className="form-field">
                  <label className="form-label">Catégorie *</label>
                  <select className="form-select" value={modal.category ?? 'fournitures'} onChange={e => setModal({ ...modal, category: e.target.value })}>
                    {Object.entries(SUPPLIER_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Montant contrat (FCFA)</label>
                  <input className="form-input" type="number" min={0} value={modal.contract_amount ?? ''} onChange={e => setModal({ ...modal, contract_amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Contact</label>
                  <input className="form-input" value={modal.contact_name ?? ''} onChange={e => setModal({ ...modal, contact_name: e.target.value })} placeholder="Nom du responsable" />
                </div>
                <div className="form-field">
                  <label className="form-label">Téléphone</label>
                  <input className="form-input" value={modal.phone ?? ''} onChange={e => setModal({ ...modal, phone: e.target.value })} placeholder="+225 07 00 00 00 00" />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={modal.email ?? ''} onChange={e => setModal({ ...modal, email: e.target.value })} placeholder="contact@fournisseur.ci" />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={modal.notes ?? ''} onChange={e => setModal({ ...modal, notes: e.target.value })} placeholder="Spécialité, délais habituels, conditions…" />
                </div>
              </div>
            </div>
            <div className="mr-modal__actions">
              <button className="btn btn--secondary" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn btn--primary" onClick={handleSave} disabled={saving || !modal.name}>
                {saving ? 'Enregistrement…' : modal.id ? 'Modifier' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="mr-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="mr-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Supprimer ce fournisseur ?</h2>
              <button className="mr-modal__close" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <div className="mr-modal__body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cette action est irréversible.</p>
              {deleteError && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: 8 }}>{deleteError}</p>}
            </div>
            <div className="mr-modal__actions">
              <button className="btn btn--secondary" onClick={() => setDeleteId(null)}>Annuler</button>
              <button className="btn btn--danger" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
