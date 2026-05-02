import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getProjectAccounting, createSupplier, updateSupplier, deleteSupplier,
  createInvoice, updateInvoice, deleteInvoice,
  type ProjectAccounting, type Supplier, type Invoice,
} from '../api/accounting';
import PageHeader from '../../../components/ui/PageHeader';

const fmtFCFA = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + ' Mds';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + ' M';
  return n.toLocaleString('fr-FR');
};

const fmtFull = (n: number) => Number(n).toLocaleString('fr-FR') + ' FCFA';

const INVOICE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  brouillon: { label: 'Brouillon',  color: '#94a3b8', bg: '#f1f5f9' },
  soumise:   { label: 'Soumise',    color: '#f59e0b', bg: '#fffbeb' },
  validee:   { label: 'Validée',    color: '#3b82f6', bg: '#eff6ff' },
  payee:     { label: 'Payée',      color: '#10b981', bg: '#f0fdf4' },
  disputee:  { label: 'Disputée',   color: '#ef4444', bg: '#fef2f2' },
};

const SUPPLIER_CATEGORIES = ['travaux', 'fournitures', 'services', 'sous-traitance', 'location'];
const INVOICE_CATEGORIES = ['Matériaux', 'Main d\'œuvre', 'Sous-traitance', 'Transport', 'Équipements', 'Frais généraux', 'Autre'];

type Tab = 'synthese' | 'factures' | 'fournisseurs';

export default function ProjectAccountingPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const [data, setData]         = useState<ProjectAccounting | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('synthese');

  // Modal states
  const [supplierModal, setSupplierModal] = useState<Supplier | null | 'new'>(null);
  const [invoiceModal, setInvoiceModal]   = useState<Invoice | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget]   = useState<{ type: 'supplier' | 'invoice'; id: number } | null>(null);

  function load() {
    setLoading(true);
    getProjectAccounting(projectId).then(setData).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [projectId]);

  if (loading) return <div className="page-content"><p>Chargement comptabilité…</p></div>;
  if (!data) return <div className="page-content"><p className="form-error">Erreur de chargement.</p></div>;

  const ecartColor = data.ecart >= 0 ? '#10b981' : '#ef4444';
  const ecartSign  = data.ecart >= 0 ? '+' : '';

  return (
    <div>
      <PageHeader
        breadcrumb="COMPTABILITÉ CHANTIER"
        title="Tableau de bord comptable"
        subtitle="Budget · Engagements · Réalisé · Coût à Terminaison"
      />

      <div className="page-content">
        {/* KPI Row */}
        <div className="acct-kpi-row">
          <div className="acct-kpi acct-kpi--blue">
            <div className="acct-kpi__label">Budget de référence</div>
            <div className="acct-kpi__value">{fmtFCFA(data.budget_ref)} FCFA</div>
            <div className="acct-kpi__sub">{data.dqe_total > 0 ? 'Issu du DQE validé' : 'Marché initial'}</div>
          </div>
          <div className="acct-kpi acct-kpi--orange">
            <div className="acct-kpi__label">Engagements</div>
            <div className="acct-kpi__value">{fmtFCFA(data.engage)} FCFA</div>
            <div className="acct-kpi__sub">{data.taux_engagement}% du budget</div>
          </div>
          <div className="acct-kpi acct-kpi--green">
            <div className="acct-kpi__label">Réalisé</div>
            <div className="acct-kpi__value">{fmtFCFA(data.realise)} FCFA</div>
            <div className="acct-kpi__sub">{data.taux_realisation}% du budget</div>
          </div>
          <div className="acct-kpi acct-kpi--gray">
            <div className="acct-kpi__label">Reste à consommer</div>
            <div className="acct-kpi__value">{fmtFCFA(data.rac)} FCFA</div>
            <div className="acct-kpi__sub">RAC estimé</div>
          </div>
          <div className="acct-kpi acct-kpi--purple">
            <div className="acct-kpi__label">Coût à terminaison</div>
            <div className="acct-kpi__value">{fmtFCFA(data.cat)} FCFA</div>
            <div className="acct-kpi__sub" style={{ color: ecartColor }}>
              Écart {ecartSign}{fmtFCFA(data.ecart)} FCFA
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="acct-progress-card">
          <div className="acct-progress-labels">
            <span>Réalisé ({data.taux_realisation}%)</span>
            <span>Engagé ({data.taux_engagement}%)</span>
            <span>RAC</span>
          </div>
          <div className="acct-progress-bar">
            <div className="acct-progress-bar__realise" style={{ width: `${Math.min(data.taux_realisation, 100)}%` }} />
            <div className="acct-progress-bar__engage" style={{ width: `${Math.min(data.taux_engagement, 100 - data.taux_realisation)}%` }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="dqe-page__toolbar" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
          {(['synthese', 'factures', 'fournisseurs'] as Tab[]).map(t => (
            <button
              key={t}
              className={`dqe-filter-tab ${tab === t ? 'dqe-filter-tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {{ synthese: 'Synthèse', factures: 'Factures', fournisseurs: 'Fournisseurs' }[t]}
              <span className="dqe-filter-count">
                {{ synthese: Object.keys(data.by_category).length, factures: data.invoices.length, fournisseurs: data.suppliers.length }[t]}
              </span>
            </button>
          ))}
        </div>

        {/* Synthèse */}
        {tab === 'synthese' && (
          <div className="card card--full" style={{ marginTop: 0 }}>
            <div className="card-head">
              <h3 className="card-title" style={{ margin: 0 }}>Analyse par catégorie</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th style={{ textAlign: 'right' }}>Réalisé</th>
                  <th style={{ textAlign: 'right' }}>Engagé</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Factures</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.by_category).map(([cat, vals]) => (
                  <tr key={cat}>
                    <td style={{ fontWeight: 500 }}>{cat}</td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>{fmtFull(vals.realise)}</td>
                    <td style={{ textAlign: 'right', color: '#f59e0b' }}>{fmtFull(vals.engage)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtFull(vals.realise + vals.engage)}</td>
                    <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{vals.count}</td>
                  </tr>
                ))}
                {Object.keys(data.by_category).length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>Aucune facture enregistrée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Factures */}
        {tab === 'factures' && (
          <div className="card card--full" style={{ marginTop: 0 }}>
            <div className="card-head" style={{ justifyContent: 'space-between' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Factures fournisseurs</h3>
              <button className="btn btn--primary" onClick={() => setInvoiceModal('new')}>+ Nouvelle facture</button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Fournisseur</th>
                  <th>Catégorie</th>
                  <th style={{ textAlign: 'right' }}>Montant HT</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map(inv => {
                  const st = INVOICE_STATUS[inv.status];
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{inv.reference}</td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{inv.supplier?.name ?? '—'}</td>
                      <td>{inv.category}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtFull(inv.amount_ht)}</td>
                      <td style={{ fontSize: 13 }}>{new Date(inv.invoice_date).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <span style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-icon btn-icon--edit" onClick={() => setInvoiceModal(inv)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button className="btn-icon btn-icon--delete" onClick={() => setDeleteTarget({ type: 'invoice', id: inv.id })}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data.invoices.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>Aucune facture</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Fournisseurs */}
        {tab === 'fournisseurs' && (
          <div className="card card--full" style={{ marginTop: 0 }}>
            <div className="card-head" style={{ justifyContent: 'space-between' }}>
              <h3 className="card-title" style={{ margin: 0 }}>Fournisseurs & Sous-traitants</h3>
              <button className="btn btn--primary" onClick={() => setSupplierModal('new')}>+ Ajouter</button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th>Catégorie</th>
                  <th style={{ textAlign: 'right' }}>Marché</th>
                  <th style={{ textAlign: 'right' }}>Facturé</th>
                  <th style={{ textAlign: 'right' }}>Payé</th>
                  <th>Contact</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.suppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td><span className="badge" style={{ textTransform: 'capitalize' }}>{s.category}</span></td>
                    <td style={{ textAlign: 'right' }}>{fmtFull(s.contract_amount)}</td>
                    <td style={{ textAlign: 'right', color: '#f59e0b' }}>{fmtFull(s.billed ?? 0)}</td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>{fmtFull(s.paid ?? 0)}</td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {s.contact_name && <div>{s.contact_name}</div>}
                      {s.phone && <div>{s.phone}</div>}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-icon btn-icon--edit" onClick={() => setSupplierModal(s)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="btn-icon btn-icon--delete" onClick={() => setDeleteTarget({ type: 'supplier', id: s.id })}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.suppliers.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>Aucun fournisseur</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Modal */}
      {supplierModal !== null && (
        <SupplierModal
          supplier={supplierModal === 'new' ? null : supplierModal}
          projectId={projectId}
          onSave={async (d) => {
            if (supplierModal === 'new') await createSupplier(projectId, d);
            else await updateSupplier(projectId, (supplierModal as Supplier).id, d);
            load();
            setSupplierModal(null);
          }}
          onClose={() => setSupplierModal(null)}
        />
      )}

      {/* Invoice Modal */}
      {invoiceModal !== null && (
        <InvoiceModal
          invoice={invoiceModal === 'new' ? null : invoiceModal}
          suppliers={data.suppliers}
          projectId={projectId}
          onSave={async (d) => {
            if (invoiceModal === 'new') await createInvoice(projectId, d);
            else await updateInvoice(projectId, (invoiceModal as Invoice).id, d);
            load();
            setInvoiceModal(null);
          }}
          onClose={() => setInvoiceModal(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="mr-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="mr-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Confirmer la suppression</h2>
              <button className="mr-modal__close" onClick={() => setDeleteTarget(null)}>✕</button>
            </div>
            <div className="mr-modal__body">
              <p style={{ margin: '0 0 1.5rem', color: 'var(--color-text-secondary)' }}>
                Cette action est irréversible.
              </p>
              <div className="mr-modal__actions">
                <button className="btn btn--secondary" onClick={() => setDeleteTarget(null)}>Annuler</button>
                <button className="btn btn--danger" onClick={async () => {
                  if (deleteTarget.type === 'supplier') await deleteSupplier(projectId, deleteTarget.id);
                  else await deleteInvoice(projectId, deleteTarget.id);
                  load();
                  setDeleteTarget(null);
                }}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Supplier Modal ─────────────────────────────── */
function SupplierModal({ supplier, projectId: _, onSave, onClose }: {
  supplier: Supplier | null;
  projectId: number;
  onSave: (d: Partial<Supplier>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: supplier?.name ?? '',
    category: supplier?.category ?? 'travaux',
    contact_name: supplier?.contact_name ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    contract_amount: supplier?.contract_amount ?? 0,
    notes: supplier?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="mr-modal-overlay" onClick={onClose}>
      <div className="mr-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="mr-modal__head">
          <h2 className="mr-modal__title">{supplier ? 'Modifier fournisseur' : 'Nouveau fournisseur'}</h2>
          <button className="mr-modal__close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="form-field">
            <label className="form-label">Nom</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">Catégorie</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Montant marché (FCFA)</label>
              <input className="form-input" type="number" min="0" value={form.contract_amount} onChange={e => setForm(f => ({ ...f, contract_amount: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">Contact</label>
              <input className="form-input" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Nom du contact" />
            </div>
            <div className="form-field">
              <label className="form-label">Téléphone</label>
              <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+225 07 xx xx xx" />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="mr-modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Invoice Modal ──────────────────────────────── */
function InvoiceModal({ invoice, suppliers, projectId: _, onSave, onClose }: {
  invoice: Invoice | null;
  suppliers: Supplier[];
  projectId: number;
  onSave: (d: Partial<Invoice>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    reference:    invoice?.reference ?? '',
    category:     invoice?.category ?? 'Matériaux',
    amount_ht:    invoice?.amount_ht ?? 0,
    amount_ttc:   invoice?.amount_ttc ?? 0,
    status:       invoice?.status ?? 'brouillon' as Invoice['status'],
    invoice_date: invoice?.invoice_date?.substring(0, 10) ?? new Date().toISOString().substring(0, 10),
    due_date:     invoice?.due_date?.substring(0, 10) ?? '',
    paid_date:    invoice?.paid_date?.substring(0, 10) ?? '',
    supplier_id:  invoice?.supplier_id ?? '',
    note:         invoice?.note ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      supplier_id: form.supplier_id || null,
      due_date:    form.due_date || null,
      paid_date:   form.paid_date || null,
      amount_ttc:  form.amount_ttc || null,
    };
    try { await onSave(payload); } finally { setSaving(false); }
  }

  return (
    <div className="mr-modal-overlay" onClick={onClose}>
      <div className="mr-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="mr-modal__head">
          <h2 className="mr-modal__title">{invoice ? 'Modifier facture' : 'Nouvelle facture'}</h2>
          <button className="mr-modal__close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">N° Référence</label>
              <input className="form-input" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} required placeholder="FAC-2026-001" />
            </div>
            <div className="form-field">
              <label className="form-label">Statut</label>
              <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Invoice['status'] }))}>
                {Object.entries(INVOICE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">Catégorie</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {INVOICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Fournisseur</label>
              <select className="form-select" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                <option value="">— Sans fournisseur —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">Montant HT (FCFA)</label>
              <input className="form-input" type="number" min="0" value={form.amount_ht} onChange={e => setForm(f => ({ ...f, amount_ht: Number(e.target.value) }))} required />
            </div>
            <div className="form-field">
              <label className="form-label">Montant TTC (FCFA)</label>
              <input className="form-input" type="number" min="0" value={form.amount_ttc} onChange={e => setForm(f => ({ ...f, amount_ttc: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">Date facture</label>
              <input className="form-input" type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label className="form-label">Échéance</label>
              <input className="form-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Date paiement</label>
              <input className="form-input" type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Note</label>
            <input className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div className="mr-modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
