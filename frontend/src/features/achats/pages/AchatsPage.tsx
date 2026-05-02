import { useEffect, useState } from 'react';
import {
  getPurchaseOrders, createPurchaseOrder, deletePurchaseOrder,
  approvePurchaseOrder, rejectPurchaseOrder, receivePurchaseOrder,
  BDC_STATUS_LABEL, BDC_STATUS_COLOR, type PurchaseOrder, type OrderItem,
} from '../api/purchase-orders';
import { getSuppliers, type GlobalSupplier } from '../../suppliers/api/suppliers';
import { useAuth } from '../../auth/stores/auth-store';

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M FCFA` :
  n >= 1_000     ? `${(n / 1_000).toFixed(0)} k FCFA` : `${n.toFixed(0)} FCFA`;

const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const EMPTY_ITEM: OrderItem = { description: '', quantity: 1, unit: 'unité', unit_price: 0, total: 0 };

export default function AchatsPage() {
  const { user } = useAuth();
  const isApprover = ['direction', 'directeur-technique'].includes(user?.role?.name ?? '');

  const [orders, setOrders]       = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<GlobalSupplier[]>([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal]         = useState<boolean>(false);
  const [form, setForm]           = useState<Partial<PurchaseOrder> & { items: OrderItem[] }>({ items: [{ ...EMPTY_ITEM }], supplier_id: undefined, project_id: undefined, expected_delivery: '', notes: '' });
  const [saving, setSaving]       = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: number; reason: string } | null>(null);
  const [detail, setDetail]       = useState<PurchaseOrder | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getPurchaseOrders(), getSuppliers()])
      .then(([o, s]) => { setOrders(o); setSuppliers(s); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const updateItem = (idx: number, field: keyof OrderItem, value: string | number) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      items[idx].total = items[idx].quantity * items[idx].unit_price;
      return { ...f, items };
    });
  };

  const total = form.items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);

  const handleCreate = async () => {
    if (!form.items.length) return;
    setSaving(true);
    try {
      await createPurchaseOrder({ ...form, total_amount: total });
      setModal(false);
      setForm({ items: [{ ...EMPTY_ITEM }] });
      load();
    } finally { setSaving(false); }
  };

  const handleApprove = async (id: number) => {
    await approvePurchaseOrder(id);
    load();
    if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: 'approuve' } : null);
  };

  const handleReject = async () => {
    if (!rejectModal?.reason.trim()) return;
    await rejectPurchaseOrder(rejectModal.id, rejectModal.reason);
    setRejectModal(null);
    load();
  };

  const handleReceive = async (id: number) => {
    await receivePurchaseOrder(id);
    load();
  };

  const handleDelete = async (id: number) => {
    await deletePurchaseOrder(id);
    load();
  };

  const filtered = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;
  const pendingOrders = orders.filter(o => o.status === 'soumis');
  const thisMonth = new Date().toISOString().slice(0, 7);
  const approvedThisMonth = orders.filter(o => o.status === 'approuve' && o.created_at.startsWith(thisMonth));

  return (
    <div className="achats-page">

      <div className="supp-header">
        <div>
          <p className="supp-header__label">MOYENS GÉNÉRAUX</p>
          <h1 className="supp-header__title">Bons de Commande</h1>
          <p className="supp-header__sub">Initier · Soumettre · Approuver · Réceptionner</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setModal(true); setForm({ items: [{ ...EMPTY_ITEM }] }); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau BDC
        </button>
      </div>

      {/* Pending banner for approvers */}
      {isApprover && pendingOrders.length > 0 && (
        <div className="acct-pending-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <strong>{pendingOrders.length} BDC en attente</strong>
          <span>— {fmt(pendingOrders.reduce((s, o) => s + o.total_amount, 0))} à valider</span>
        </div>
      )}

      {/* KPIs */}
      <div className="supp-kpi-row">
        <div className="supp-kpi">
          <span className="supp-kpi__val">{orders.filter(o => o.status === 'soumis').length}</span>
          <span className="supp-kpi__lbl">En attente d'approbation</span>
        </div>
        <div className="supp-kpi">
          <span className="supp-kpi__val">{orders.filter(o => o.status === 'approuve').length}</span>
          <span className="supp-kpi__lbl">Approuvés (en cours)</span>
        </div>
        <div className="supp-kpi">
          <span className="supp-kpi__val">{orders.filter(o => o.status === 'recu').length}</span>
          <span className="supp-kpi__lbl">Réceptionnés</span>
        </div>
        <div className="supp-kpi">
          <span className="supp-kpi__val">{fmt(approvedThisMonth.reduce((s, o) => s + o.total_amount, 0))}</span>
          <span className="supp-kpi__lbl">Approuvé ce mois</span>
        </div>
      </div>

      {/* Status filter */}
      <div className="supp-cat-filters" style={{ paddingTop: 4 }}>
        {(['', 'soumis', 'approuve', 'rejete', 'recu'] as const).map(s => {
          const count = s ? orders.filter(o => o.status === s).length : orders.length;
          return (
            <button key={s} className={`dqe-filter-btn ${statusFilter === s ? 'dqe-filter-btn--active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s ? BDC_STATUS_LABEL[s] : 'Tous'} <span className="dqe-filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Orders table */}
      {loading ? <p style={{ padding: 24, color: 'var(--text-muted)' }}>Chargement…</p> : (
        <div className="acct-table-wrap">
          <table className="acct-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Fournisseur</th>
                <th>Chantier</th>
                <th>Articles</th>
                <th style={{ textAlign: 'right' }}>Montant</th>
                <th>Livraison</th>
                <th>Statut</th>
                <th>Demandeur</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="acct-empty">Aucun bon de commande</td></tr>}
              {filtered.map(order => {
                const sc = BDC_STATUS_COLOR[order.status] ?? '#94a3b8';
                return (
                  <tr key={order.id} className={order.status === 'soumis' ? 'acct-table__row--pending' : ''}>
                    <td>
                      <button className="bdc-ref-btn" onClick={() => setDetail(order)}>{order.reference}</button>
                    </td>
                    <td>{order.supplier?.name ?? '—'}</td>
                    <td>{order.project ? <span className="acct-feed__link">{order.project.code}</span> : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{order.items.length} ligne{order.items.length > 1 ? 's' : ''}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(order.total_amount)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{order.expected_delivery ? fmtDate(order.expected_delivery) : '—'}</td>
                    <td>
                      <span className="acct-status-badge" style={{ background: `${sc}15`, color: sc, borderColor: `${sc}40` }}>
                        {BDC_STATUS_LABEL[order.status]}
                      </span>
                      {order.status === 'rejete' && order.rejection_reason && (
                        <p className="acct-rejection-reason">{order.rejection_reason}</p>
                      )}
                      {order.approver && order.status !== 'rejete' && (
                        <p className="acct-approver-name">par {order.approver.name}</p>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{order.requester?.name ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {isApprover && order.status === 'soumis' && (
                          <>
                            <button className="btn btn--sm acct-btn--approve" onClick={() => handleApprove(order.id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
                              Approuver
                            </button>
                            <button className="btn btn--sm acct-btn--reject" onClick={() => setRejectModal({ id: order.id, reason: '' })}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              Rejeter
                            </button>
                          </>
                        )}
                        {order.status === 'approuve' && (
                          <button className="btn btn--sm btn--secondary" onClick={() => handleReceive(order.id)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
                            Réceptionner
                          </button>
                        )}
                        {['soumis', 'brouillon', 'rejete'].includes(order.status) && (
                          <button className="btn-icon btn-icon--delete" onClick={() => handleDelete(order.id)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create BDC modal */}
      {modal && (
        <div className="mr-modal-overlay" onClick={() => setModal(false)}>
          <div className="mr-modal" style={{ maxWidth: 700, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Nouveau Bon de Commande</h2>
              <button className="mr-modal__close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-field">
                  <label className="form-label">Fournisseur</label>
                  <select className="form-select" value={form.supplier_id ?? ''} onChange={e => setForm({ ...form, supplier_id: e.target.value ? Number(e.target.value) : undefined })}>
                    <option value="">— Sans fournisseur —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Livraison souhaitée</label>
                  <input className="form-input" type="date" value={form.expected_delivery ?? ''} onChange={e => setForm({ ...form, expected_delivery: e.target.value })} />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label">Articles *</label>
                  <button type="button" className="btn btn--sm btn--secondary" onClick={() => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}>+ Ligne</button>
                </div>
                <div className="bdc-items-table">
                  <div className="bdc-items-head">
                    <span>Description</span><span>Qté</span><span>Unité</span><span>Prix unit.</span><span>Total</span><span></span>
                  </div>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="bdc-items-row">
                      <input className="form-input" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description de l'article" />
                      <input className="form-input" type="number" min={0.01} step="0.01" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} />
                      <input className="form-input" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} placeholder="unité" />
                      <input className="form-input" type="number" min={0} value={item.unit_price || ''} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} />
                      <span className="bdc-item-total">{(item.quantity * item.unit_price).toLocaleString('fr-FR')} F</span>
                      {form.items.length > 1 && (
                        <button type="button" className="btn-icon btn-icon--delete" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="bdc-items-total">
                    <span>Total BDC</span>
                    <strong>{fmt(total)}</strong>
                  </div>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Instructions de livraison, urgence, contexte…" />
              </div>

              <div className="acct-approval-notice">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Ce BDC sera soumis directement à la Direction / DT pour approbation avant toute exécution.
              </div>
            </div>
            <div className="mr-modal__actions">
              <button className="btn btn--secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn btn--primary" onClick={handleCreate} disabled={saving || form.items.every(i => !i.description)}>
                {saving ? 'Envoi…' : 'Soumettre pour approbation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {detail && (
        <div className="mr-modal-overlay" onClick={() => setDetail(null)}>
          <div className="mr-modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <div>
                <h2 className="mr-modal__title">{detail.reference}</h2>
                <span className="acct-status-badge" style={{ background: `${BDC_STATUS_COLOR[detail.status]}15`, color: BDC_STATUS_COLOR[detail.status], borderColor: `${BDC_STATUS_COLOR[detail.status]}40`, marginTop: 6 }}>
                  {BDC_STATUS_LABEL[detail.status]}
                </span>
              </div>
              <button className="mr-modal__close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="mr-modal__body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 20, fontSize: '0.84rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Fournisseur</span><p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detail.supplier?.name ?? '—'}</p></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Chantier</span><p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detail.project?.name ?? '—'}</p></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Demandeur</span><p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detail.requester?.name ?? '—'}</p></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Livraison souhaitée</span><p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detail.expected_delivery ? fmtDate(detail.expected_delivery) : '—'}</p></div>
              </div>
              <table className="acct-table" style={{ marginBottom: 16 }}>
                <thead>
                  <tr><th>Description</th><th>Qté</th><th>Unité</th><th>P.U.</th><th style={{ textAlign: 'right' }}>Total</th></tr>
                </thead>
                <tbody>
                  {detail.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{item.unit_price.toLocaleString('fr-FR')} F</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.total.toLocaleString('fr-FR')} F</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} style={{ fontWeight: 700, textAlign: 'right', borderTop: '2px solid var(--border)' }}>Total</td>
                    <td style={{ fontWeight: 700, textAlign: 'right', borderTop: '2px solid var(--border)', color: 'var(--accent)' }}>{fmt(detail.total_amount)}</td>
                  </tr>
                </tbody>
              </table>
              {detail.notes && <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Note : {detail.notes}</p>}
              {detail.rejection_reason && <p className="acct-rejection-reason" style={{ marginTop: 8 }}>Motif rejet : {detail.rejection_reason}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="mr-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head"><h2 className="mr-modal__title">Motif de rejet</h2><button className="mr-modal__close" onClick={() => setRejectModal(null)}>✕</button></div>
            <div className="mr-modal__body">
              <div className="form-field">
                <label className="form-label">Motif *</label>
                <textarea className="form-textarea" rows={3} value={rejectModal.reason} onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })} placeholder="ex: Fournisseur non homologué, montant hors budget…" autoFocus />
              </div>
            </div>
            <div className="mr-modal__actions">
              <button className="btn btn--secondary" onClick={() => setRejectModal(null)}>Annuler</button>
              <button className="btn btn--danger" onClick={handleReject} disabled={!rejectModal.reason.trim()}>Confirmer le rejet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
