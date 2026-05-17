import SkeletonPage from '../../../components/ui/SkeletonPage';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrders, createPurchaseOrder, deletePurchaseOrder,
  approvePurchaseOrder, rejectPurchaseOrder, receivePurchaseOrder,
  getDeliveryDocs,
  BDC_STATUS_LABEL, BDC_STATUS_COLOR,
  type PurchaseOrder, type OrderItem, type DeliveryDocs,
} from '../api/purchase-orders';
import { getSuppliers } from '../../suppliers/api/suppliers';
import { useAuth } from '../../auth/stores/auth-store';
import PageHeader from '../../../components/ui/PageHeader';
import { fmtFCFA as fmt, fmtDate } from '../../../lib/formatters';

const EMPTY_ITEM: OrderItem = { description: '', quantity: 1, unit: 'unité', unit_price: 0, total: 0 };

interface ReceiveForm { deliveryNote: File | null; photos: File[]; notes: string; }

export default function AchatsPage() {
  const { user } = useAuth();
  const isApprover   = ['direction', 'directeur-technique'].includes(user?.role?.name ?? '');
  const isLogistique = ['moyens-generaux', 'direction', 'directeur-technique'].includes(user?.role?.name ?? '');

  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal]           = useState<boolean>(false);
  const [form, setForm]             = useState<Partial<PurchaseOrder> & { items: OrderItem[] }>({ items: [{ ...EMPTY_ITEM }] });
  const [saving, setSaving]         = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: number; reason: string } | null>(null);
  const [detail, setDetail]         = useState<PurchaseOrder | null>(null);
  const [receiveModal, setReceiveModal] = useState<PurchaseOrder | null>(null);
  const [receiveForm, setReceiveForm] = useState<ReceiveForm>({ deliveryNote: null, photos: [], notes: '' });
  const [deliveryDocs, setDeliveryDocs] = useState<DeliveryDocs | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [escaladeError, setEscaladeError] = useState<{ message: string; required_role: string; amount: number } | null>(null);

  const blInputRef    = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const { data: orders = [], isLoading: loading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: getPurchaseOrders,
    staleTime: 60_000,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
    staleTime: 120_000,
  });

  // Charger les documents de livraison quand le panneau détail s'ouvre pour une commande reçue
  useEffect(() => {
    if (detail?.status === 'recu') {
      setDeliveryDocs(null);
      setLoadingDocs(true);
      getDeliveryDocs(detail.id).then(setDeliveryDocs).finally(() => setLoadingDocs(false));
    } else {
      setDeliveryDocs(null);
    }
  }, [detail?.id, detail?.status]);

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
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    } finally { setSaving(false); }
  };

  const handleApprove = async (id: number) => {
    try {
      setEscaladeError(null);
      await approvePurchaseOrder(id);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, status: 'approuve' } : null);
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { message?: string; required_role?: string; amount?: number } } }).response;
      if (resp?.status === 403 && resp.data?.required_role) {
        setEscaladeError({ message: resp.data.message ?? '', required_role: resp.data.required_role, amount: resp.data.amount ?? 0 });
      }
    }
  };

  const handleReject = async () => {
    if (!rejectModal?.reason.trim()) return;
    await rejectPurchaseOrder(rejectModal.id, rejectModal.reason);
    setRejectModal(null);
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  };

  const openReceive = (order: PurchaseOrder) => {
    setReceiveModal(order);
    setReceiveForm({ deliveryNote: null, photos: [], notes: '' });
  };

  const handleReceive = async () => {
    if (!receiveModal) return;
    setSaving(true);
    try {
      const fd = new FormData();
      if (receiveForm.deliveryNote) fd.append('delivery_note', receiveForm.deliveryNote);
      receiveForm.photos.forEach(p => fd.append('photos[]', p));
      if (receiveForm.notes.trim()) fd.append('reception_notes', receiveForm.notes);
      await receivePurchaseOrder(receiveModal.id, fd);
      setReceiveModal(null);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    await deletePurchaseOrder(id);
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  };

  const filtered = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;
  const pendingOrders = orders.filter(o => o.status === 'soumis');
  const thisMonth = new Date().toISOString().slice(0, 7);
  const approvedThisMonth = orders.filter(o => o.status === 'approuve' && o.created_at.startsWith(thisMonth));

  return (
    <div>
      <PageHeader
        title="Bons de Commande"
        subtitle="Initier · Soumettre · Approuver · Réceptionner"
        action={
          <button className="btn-primary" onClick={() => { setModal(true); setForm({ items: [{ ...EMPTY_ITEM }] }); }}>
            + Nouveau BDC
          </button>
        }
      />

      {escaladeError && (
        <div className="acct-escalade-banner" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>
            <strong>Autorisation insuffisante</strong> — Ce BDC nécessite un <em>{escaladeError.required_role}</em> pour être approuvé.
            {' '}Contactez votre supérieur hiérarchique.
          </span>
          <button className="acct-escalade-banner__close" onClick={() => setEscaladeError(null)}>×</button>
        </div>
      )}

      {isApprover && pendingOrders.length > 0 && (
        <div className="acct-pending-banner" style={{ marginBottom: 16 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <strong>{pendingOrders.length} BDC en attente</strong>
          <span>— {fmt(pendingOrders.reduce((s, o) => s + o.total_amount, 0))} à valider</span>
        </div>
      )}

      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{orders.filter(o => o.status === 'soumis').length}</div>
            <div className="proj-kpi__label">En attente d'approbation</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{orders.filter(o => o.status === 'approuve').length}</div>
            <div className="proj-kpi__label">Approuvés (en cours)</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--teal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{orders.filter(o => o.status === 'recu').length}</div>
            <div className="proj-kpi__label">Réceptionnés</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmt(approvedThisMonth.reduce((s, o) => s + o.total_amount, 0))}</div>
            <div className="proj-kpi__label">Approuvé ce mois</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Onglets de filtres */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          {(['', 'soumis', 'approuve', 'rejete', 'recu'] as const).map(s => {
            const count = s ? orders.filter(o => o.status === s).length : orders.length;
            const active = statusFilter === s;
            return (
              <button key={s} className={`bud-tab${active ? ' bud-tab--active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s ? BDC_STATUS_LABEL[s] : 'Tous'}
                <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, background: active ? 'rgba(255,255,255,0.2)' : 'var(--border)', color: active ? 'inherit' : 'var(--text-muted)', borderRadius: 4, padding: '1px 5px' }}>{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <SkeletonPage rows={2} />
        ) : (
          <table className="data-table">
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
              {filtered.length === 0 && <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun bon de commande</td></tr>}
              {filtered.map(order => {
                const sc = BDC_STATUS_COLOR[order.status] ?? '#94a3b8';
                return (
                  <tr key={order.id} className={order.status === 'soumis' ? 'acct-table__row--pending' : ''} style={{ cursor: 'pointer' }} onClick={() => setDetail(order)}>
                    <td>
                      <span className="bdc-ref-btn">{order.reference}</span>
                    </td>
                    <td>{order.supplier?.name ?? '—'}</td>
                    <td>{order.project ? <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{order.project.code}</span> : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{order.items.length} ligne{order.items.length > 1 ? 's' : ''}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(order.total_amount)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{order.expected_delivery ? fmtDate(order.expected_delivery) : '—'}</td>
                    <td>
                      <span className="acct-status-badge" style={{ background: `${sc}15`, color: sc, borderColor: `${sc}40` }}>
                        {BDC_STATUS_LABEL[order.status]}
                      </span>
                      {order.status === 'recu' && (order.delivery_note_path || order.delivery_photos?.length) && (
                        <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                          Pièces jointes
                        </p>
                      )}
                      {order.status === 'rejete' && order.rejection_reason && (
                        <p className="acct-rejection-reason">{order.rejection_reason}</p>
                      )}
                      {order.approver && order.status !== 'rejete' && (
                        <p className="acct-approver-name">par {order.approver.name}</p>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{order.requester?.name ?? '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {isApprover && order.status === 'soumis' && (
                          <>
                            <button className="btn btn--sm acct-btn--approve" onClick={() => handleApprove(order.id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
                              Approuver
                            </button>
                            <button className="btn btn--sm acct-btn--reject" onClick={() => setRejectModal({ id: order.id, reason: '' })}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              Rejeter
                            </button>
                          </>
                        )}
                        {isLogistique && order.status === 'approuve' && (
                          <button className="btn btn--sm btn--secondary" onClick={() => openReceive(order)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
                            Réceptionner
                          </button>
                        )}
                        {['soumis', 'brouillon', 'rejete'].includes(order.status) && (
                          <button className="btn-icon btn-icon--delete" onClick={() => handleDelete(order.id)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Receive + delivery docs modal ── */}
      {receiveModal && (
        <div className="mr-modal-overlay" onClick={() => setReceiveModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <div>
                <h2 className="mr-modal__title">Réceptionner {receiveModal.reference}</h2>
                <p className="mr-modal__sub" style={{ marginTop: 2, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Joignez les pièces justificatives (optionnel mais recommandé)
                </p>
              </div>
              <button className="mr-modal__close" aria-label="Fermer" onClick={() => setReceiveModal(null)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* BL upload */}
              <div className="form-field">
                <label className="form-label">Bon de livraison (PDF ou image)</label>
                <div className="bdc-file-drop" onClick={() => blInputRef.current?.click()}>
                  {receiveForm.deliveryNote ? (
                    <div className="bdc-file-chip">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span>{receiveForm.deliveryNote.name}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setReceiveForm(f => ({ ...f, deliveryNote: null })); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                  ) : (
                    <span className="bdc-file-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Cliquer pour sélectionner un fichier
                    </span>
                  )}
                </div>
                <input ref={blInputRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) setReceiveForm(r => ({ ...r, deliveryNote: f })); e.target.value = ''; }} />
              </div>

              {/* Upload de photos */}
              <div className="form-field">
                <label className="form-label">Photos attestant la livraison (max 10)</label>
                <div className="bdc-file-drop bdc-photos-drop" onClick={() => photoInputRef.current?.click()}>
                  {receiveForm.photos.length === 0 ? (
                    <span className="bdc-file-placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      Cliquer pour ajouter des photos
                    </span>
                  ) : (
                    <div className="bdc-photo-chips">
                      {receiveForm.photos.map((p, i) => (
                        <div key={i} className="bdc-file-chip bdc-photo-chip">
                          <img src={URL.createObjectURL(p)} alt={p.name} width={32} height={32} style={{ objectFit: 'cover', borderRadius: 4 }} />
                          <span>{p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name}</span>
                          <button type="button" onClick={e => { e.stopPropagation(); setReceiveForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) })); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        </div>
                      ))}
                      <span className="bdc-file-add-more">+ Ajouter</span>
                    </div>
                  )}
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                  onChange={e => {
                    const files = Array.from(e.target.files ?? []).slice(0, 10 - receiveForm.photos.length);
                    setReceiveForm(f => ({ ...f, photos: [...f.photos, ...files].slice(0, 10) }));
                    e.target.value = '';
                  }} />
              </div>

              {/* Notes */}
              <div className="form-field">
                <label className="form-label">Observations à la réception</label>
                <textarea className="form-textarea" rows={2}
                  value={receiveForm.notes}
                  onChange={e => setReceiveForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ex: Cartons en bon état, 2 colis manquants signalés au chauffeur…" />
              </div>

              {!receiveForm.deliveryNote && receiveForm.photos.length === 0 ? (
                <div className="acct-approval-notice" style={{ background: 'color-mix(in srgb, #ef4444 6%, var(--surface))', borderColor: 'color-mix(in srgb, #ef4444 30%, transparent)', color: '#ef4444' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Un bon de livraison ou au moins une photo est obligatoire pour réceptionner.
                </div>
              ) : (
                <div className="acct-approval-notice" style={{ background: 'color-mix(in srgb, #10b981 8%, var(--surface))', borderColor: 'color-mix(in srgb, #10b981 30%, transparent)', color: '#10b981' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Pièces prêtes — la réception sera enregistrée avec justificatifs.
                </div>
              )}
            </div>
            <div className="mr-modal__actions">
              <button className="btn btn--secondary" onClick={() => setReceiveModal(null)}>Annuler</button>
              <button className="btn btn--primary" onClick={handleReceive}
                disabled={saving || (!receiveForm.deliveryNote && receiveForm.photos.length === 0)}>
                {saving ? 'Enregistrement…' : 'Confirmer la réception'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create BDC modal ── */}
      {modal && (
        <div className="mr-modal-overlay" onClick={() => setModal(false)}>
          <div className="mr-modal" style={{ maxWidth: 700, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Nouveau Bon de Commande</h2>
              <button className="mr-modal__close" aria-label="Fermer" onClick={() => setModal(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
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

      {/* ── Detail panel ── */}
      {detail && (
        <div className="mr-modal-overlay" onClick={() => setDetail(null)}>
          <div className="mr-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <div>
                <h2 className="mr-modal__title">{detail.reference}</h2>
                <span className="acct-status-badge" style={{ background: `${BDC_STATUS_COLOR[detail.status]}15`, color: BDC_STATUS_COLOR[detail.status], borderColor: `${BDC_STATUS_COLOR[detail.status]}40`, marginTop: 6 }}>
                  {BDC_STATUS_LABEL[detail.status]}
                </span>
              </div>
              <button className="mr-modal__close" aria-label="Fermer" onClick={() => setDetail(null)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="mr-modal__body" style={{ overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 20, fontSize: '0.84rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Fournisseur</span><p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detail.supplier?.name ?? '—'}</p></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Chantier</span><p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detail.project?.name ?? '—'}</p></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Demandeur</span><p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detail.requester?.name ?? '—'}</p></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Livraison souhaitée</span><p style={{ margin: '2px 0 0', fontWeight: 600 }}>{detail.expected_delivery ? fmtDate(detail.expected_delivery) : '—'}</p></div>
                {detail.received_at && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Réceptionné le</span><p style={{ margin: '2px 0 0', fontWeight: 600, color: 'var(--success)' }}>{fmtDate(detail.received_at)}</p></div>
                )}
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

              {detail.notes && <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 12 }}>Note : {detail.notes}</p>}
              {detail.rejection_reason && <p className="acct-rejection-reason" style={{ marginBottom: 12 }}>Motif rejet : {detail.rejection_reason}</p>}

              {/* Chronologie du workflow */}
              {(() => {
                const steps: { label: string; actor?: string; date?: string | null; color: string; note?: string }[] = [
                  { label: 'Créé', actor: detail.requester?.name, date: detail.created_at, color: '#64748b' },
                  ...(detail.status !== 'brouillon' ? [{ label: 'Soumis pour approbation', date: detail.created_at, color: '#f59e0b' }] : []),
                  ...(detail.approved_at && detail.status !== 'rejete' ? [{ label: 'Approuvé', actor: detail.approver?.name, date: detail.approved_at, color: '#10b981' }] : []),
                  ...(detail.status === 'rejete' ? [{ label: 'Rejeté', actor: detail.approver?.name, note: detail.rejection_reason, color: '#ef4444' }] : []),
                  ...(detail.received_at ? [{ label: 'Réceptionné', date: detail.received_at, color: '#3b82f6' }] : []),
                ];
                return (
                  <div style={{ marginTop: 4 }}>
                    <p style={{ margin: '0 0 10px', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Historique</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: step.color, marginTop: 4, flexShrink: 0 }} />
                            {i < steps.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 18 }} />}
                          </div>
                          <div style={{ paddingBottom: 12 }}>
                            <p style={{ margin: 0, fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-body)' }}>{step.label}</p>
                            {step.actor && <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>par {step.actor}</p>}
                            {step.note && <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: step.color }}>{step.note}</p>}
                            {step.date && <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>{fmtDate(step.date)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Section documents de livraison (commandes reçues uniquement) */}
              {detail.status === 'recu' && (
                <div className="bdc-delivery-docs">
                  <div className="bdc-delivery-docs__header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    Pièces justificatives de réception
                  </div>
                  {loadingDocs ? (
                    <div className="skeleton" style={{ height: 32, borderRadius: 4, margin: '8px 0' }} />
                  ) : deliveryDocs ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {deliveryDocs.reception_notes && (
                        <p className="bdc-reception-note">
                          <strong>Observations :</strong> {deliveryDocs.reception_notes}
                        </p>
                      )}
                      {deliveryDocs.delivery_note_url ? (
                        <a href={deliveryDocs.delivery_note_url} target="_blank" rel="noopener noreferrer" className="bdc-doc-link">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          Voir le bon de livraison
                        </a>
                      ) : (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Aucun bon de livraison joint</p>
                      )}
                      {deliveryDocs.photo_urls.length > 0 ? (
                        <div className="bdc-photo-gallery">
                          {deliveryDocs.photo_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="bdc-photo-thumb">
                              <img src={url} alt={`Photo ${i + 1}`} />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Aucune photo jointe</p>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', padding: '8px 0' }}>Aucune pièce justificative enregistrée</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject modal ── */}
      {rejectModal && (
        <div className="mr-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head"><h2 className="mr-modal__title">Motif de rejet</h2><button className="mr-modal__close" aria-label="Fermer" onClick={() => setRejectModal(null)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
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
