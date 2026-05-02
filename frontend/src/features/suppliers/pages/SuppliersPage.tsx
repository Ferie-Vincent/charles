import { useEffect, useState } from 'react';
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  SUPPLIER_CATEGORIES, type GlobalSupplier,
} from '../api/suppliers';

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

  const totalFacturé = suppliers.reduce((s, sup) => s + (sup.invoices_sum_amount_ht ?? 0), 0);
  const totalContrats = suppliers.reduce((s, sup) => s + (sup.contract_amount ?? 0), 0);

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
    <div className="supp-page">
      {/* Header */}
      <div className="supp-header">
        <div>
          <p className="supp-header__label">MOYENS GÉNÉRAUX</p>
          <h1 className="supp-header__title">Base Fournisseurs</h1>
          <p className="supp-header__sub">Annuaire centralisé — partagé par tous les chantiers</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModal({ ...EMPTY })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau fournisseur
        </button>
      </div>

      {/* KPIs */}
      <div className="supp-kpi-row">
        <div className="supp-kpi">
          <span className="supp-kpi__val">{suppliers.length}</span>
          <span className="supp-kpi__lbl">Fournisseurs</span>
        </div>
        <div className="supp-kpi">
          <span className="supp-kpi__val">{suppliers.filter(s => (s.invoices_count ?? 0) > 0).length}</span>
          <span className="supp-kpi__lbl">Actifs (avec factures)</span>
        </div>
        <div className="supp-kpi">
          <span className="supp-kpi__val">{fmt(totalFacturé)} FCFA</span>
          <span className="supp-kpi__lbl">Total facturé</span>
        </div>
        <div className="supp-kpi">
          <span className="supp-kpi__val">{fmt(totalContrats)} FCFA</span>
          <span className="supp-kpi__lbl">Total montants contrats</span>
        </div>
      </div>

      {/* Filters */}
      <div className="supp-filters">
        <div className="acct-search-wrap" style={{ flex: 1, maxWidth: 360 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" className="acct-search-icon">
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <div className="supp-cat-filters">
          <button className={`dqe-filter-btn ${!catFilter ? 'dqe-filter-btn--active' : ''}`} onClick={() => setCatFilter('')}>
            Tous <span className="dqe-filter-count">{suppliers.length}</span>
          </button>
          {Object.entries(SUPPLIER_CATEGORIES).map(([k, v]) => {
            const count = suppliers.filter(s => s.category === k).length;
            if (!count) return null;
            return (
              <button key={k} className={`dqe-filter-btn ${catFilter === k ? 'dqe-filter-btn--active' : ''}`} onClick={() => setCatFilter(k === catFilter ? '' : k)}>
                {v} <span className="dqe-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ padding: '24px', color: 'var(--text-muted)' }}>Chargement…</p>
      ) : (
        <div className="acct-table-wrap">
          <table className="acct-table supp-table">
            <thead>
              <tr>
                <th>Fournisseur</th>
                <th>Catégorie</th>
                <th>Contact</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Montant contrat</th>
                <th>Factures</th>
                <th>Total facturé</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="acct-empty">
                  {search || catFilter ? 'Aucun fournisseur pour ce filtre' : 'Aucun fournisseur — créez-en un'}
                </td></tr>
              )}
              {filtered.map(s => {
                const cc = CAT_COLOR[s.category] ?? '#94a3b8';
                return (
                  <tr key={s.id}>
                    <td>
                      <span className="supp-name">{s.name}</span>
                      {s.notes && <p className="supp-notes">{s.notes}</p>}
                    </td>
                    <td>
                      <span className="acct-status-badge" style={{ background: `${cc}12`, color: cc, borderColor: `${cc}35` }}>
                        {SUPPLIER_CATEGORIES[s.category] ?? s.category}
                      </span>
                    </td>
                    <td>{s.contact_name || '—'}</td>
                    <td>{s.phone || '—'}</td>
                    <td>
                      {s.email
                        ? <a href={`mailto:${s.email}`} className="supp-email">{s.email}</a>
                        : '—'
                      }
                    </td>
                    <td>{s.contract_amount ? `${fmt(s.contract_amount)} FCFA` : '—'}</td>
                    <td>
                      <span className={`supp-inv-count ${(s.invoices_count ?? 0) > 0 ? 'supp-inv-count--active' : ''}`}>
                        {s.invoices_count ?? 0}
                      </span>
                    </td>
                    <td>
                      {(s.invoices_sum_amount_ht ?? 0) > 0
                        ? <strong>{fmt(s.invoices_sum_amount_ht!)} FCFA</strong>
                        : '—'
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-icon btn-icon--edit" onClick={() => setModal({ ...s })}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon btn-icon--delete" onClick={() => { setDeleteId(s.id); setDeleteError(''); }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
