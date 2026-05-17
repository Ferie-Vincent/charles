import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../../components/ui/PageHeader';
import { useAuth } from '../../auth/stores/auth-store';
import {
  getBesoins, createBesoin, approveBesoin, rejectBesoin,
  prepareBesoin, deliverBesoin, recordBesoin,
  CATEGORY_LABEL, URGENCY_COLOR, STATUS_LABEL, STATUS_BADGE,
  type BesoinCategory, type BesoinUrgency,
} from '../api/besoins';
import { listProjects } from '../../projects/api/list-projects';

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M FCFA`
  : n >= 1_000   ? `${(n / 1_000).toFixed(0)} k FCFA`
  : `${n.toFixed(0)} FCFA`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const EMPTY_FORM = {
  project_id: '' as unknown as number,
  title: '',
  description: '',
  category: 'materiaux' as BesoinCategory,
  quantity: '' as unknown as number,
  unit: '',
  estimated_cost: '' as unknown as number,
  urgency: 'normal' as BesoinUrgency,
  notes: '',
};

const TERRAIN    = ['chef-chantier', 'conducteur-travaux'];
const DIRECTION  = ['direction', 'directeur-technique'];
const LOGISTIQUE = ['moyens-generaux'];
const COMPTABLE  = ['comptable'];

export default function BesoinsPage() {
  const { user } = useAuth();
  const role = user?.role?.name ?? '';

  const isDirection  = DIRECTION.includes(role);
  const isLogistique = LOGISTIQUE.includes(role);
  const isComptable  = COMPTABLE.includes(role);
  const isTerrain    = TERRAIN.includes(role);
  const canCreate    = isTerrain || isDirection;

  const queryClient = useQueryClient();
  const [filter, setFilter]     = useState('');
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: number; reason: string } | null>(null);
  const [recordModal, setRecordModal] = useState<{ id: number; cost: string } | null>(null);
  const [detailModal, setDetailModal] = useState<import('../api/besoins').DemandeBesoin | null>(null);

  const { data: besoins = [], isLoading: loading } = useQuery({
    queryKey: ['besoins'],
    queryFn: getBesoins,
    staleTime: 60_000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
    enabled: canCreate,
    staleTime: 120_000,
  });

  const filtered = filter ? besoins.filter(b => b.status === filter) : besoins;

  const counts = besoins.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});

  const pending      = besoins.filter(b => b.status === 'soumis').length;
  const approved     = besoins.filter(b => b.status === 'approuve').length;
  const inPrep       = besoins.filter(b => b.status === 'en_preparation').length;
  const totalEstimated = besoins.reduce((s, b) => s + (b.estimated_cost ?? 0), 0);

  const handleCreate = async () => {
    if (!form.project_id || !form.title) return;
    setSaving(true);
    try {
      await createBesoin(form);
      setModal(false);
      setForm({ ...EMPTY_FORM });
      queryClient.invalidateQueries({ queryKey: ['besoins'] });
    } finally { setSaving(false); }
  };

  const handleApprove = async (id: number) => {
    await approveBesoin(id);
    queryClient.invalidateQueries({ queryKey: ['besoins'] });
  };

  const handleReject = async () => {
    if (!rejectModal?.reason.trim()) return;
    await rejectBesoin(rejectModal.id, rejectModal.reason);
    setRejectModal(null);
    queryClient.invalidateQueries({ queryKey: ['besoins'] });
  };

  const handlePrepare = async (id: number) => {
    await prepareBesoin(id);
    queryClient.invalidateQueries({ queryKey: ['besoins'] });
  };

  const handleDeliver = async (id: number) => {
    await deliverBesoin(id);
    queryClient.invalidateQueries({ queryKey: ['besoins'] });
  };

  const handleRecord = async () => {
    if (!recordModal) return;
    const cost = parseFloat(recordModal.cost);
    if (!cost || cost <= 0) return;
    setSaving(true);
    try {
      await recordBesoin(recordModal.id, cost);
      setRecordModal(null);
      queryClient.invalidateQueries({ queryKey: ['besoins'] });
    } finally { setSaving(false); }
  };

  const STATUSES = [
    { key: 'soumis',         label: 'Soumis' },
    { key: 'approuve',       label: 'Approuvés' },
    { key: 'rejete',         label: 'Rejetés' },
    { key: 'en_preparation', label: 'En préparation' },
    { key: 'livre',          label: 'Livrés' },
    { key: 'comptabilise',   label: 'Comptabilisés' },
  ];

  return (
    <div>
      <PageHeader
        title="Demandes de Besoins"
        subtitle="Terrain → Direction → Moyens Généraux → Comptabilité"
        action={canCreate ? (
          <button className="btn-primary" onClick={() => setModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nouvelle demande
          </button>
        ) : undefined}
      />

      {/* KPIs */}
      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ color: pending > 0 ? '#f59e0b' : undefined }}>{pending}</div>
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
            <div className="proj-kpi__value">{approved}</div>
            <div className="proj-kpi__label">Approuvées</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--teal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{inPrep}</div>
            <div className="proj-kpi__label">En préparation</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmt(totalEstimated)}</div>
            <div className="proj-kpi__label">Montant estimé total</div>
          </div>
        </div>
      </div>

      {/* Panneau tableau */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Barre de filtres */}
        <div style={{ display: 'flex', gap: 6, padding: '14px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={`bud-tab ${!filter ? 'bud-tab--active' : ''}`} onClick={() => setFilter('')}>
            Tous <span className="dqe-filter-count">{besoins.length}</span>
          </button>
          {STATUSES.map(s => {
            const count = counts[s.key] ?? 0;
            if (!count && filter !== s.key) return null;
            return (
              <button key={s.key} className={`bud-tab ${filter === s.key ? 'bud-tab--active' : ''}`} onClick={() => setFilter(filter === s.key ? '' : s.key)}>
                {s.label} <span className="dqe-filter-count">{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? <div className="skeleton skeleton-page__card" style={{ margin: 16 }} /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Demande</th>
                <th>Chantier</th>
                <th>Catégorie</th>
                <th>Urgence</th>
                <th style={{ textAlign: 'right' }}>Montant estimé</th>
                <th>Statut</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="acct-empty">Aucune demande trouvée</td></tr>
              )}
              {filtered.map(b => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => setDetailModal(b)}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>{b.title}</span>
                    {b.requester && <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>par {b.requester.name}</p>}
                    {b.rejection_reason && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--danger)' }}>↳ {b.rejection_reason}</p>}
                  </td>
                  <td style={{ fontSize: '0.84rem' }}>
                    {b.project ? (
                      <><span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '0.75rem' }}>{b.project.code}</span><br />{b.project.name}</>
                    ) : '—'}
                  </td>
                  <td><span className="badge badge-draft">{CATEGORY_LABEL[b.category]}</span></td>
                  <td>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: URGENCY_COLOR[b.urgency], textTransform: 'uppercase' }}>
                      {b.urgency}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-body)' }}>
                    {b.estimated_cost ? fmt(b.estimated_cost) : '—'}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[b.status]}`}>{STATUS_LABEL[b.status]}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{fmtDate(b.created_at)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                      {/* Direction: approve / reject */}
                      {isDirection && b.status === 'soumis' && (
                        <>
                          <button className="btn btn--sm btn--primary" style={{ background: 'var(--success)', borderColor: 'var(--success)', color: '#fff' }} onClick={() => handleApprove(b.id)}>✓</button>
                          <button className="btn btn--sm btn--danger" onClick={() => setRejectModal({ id: b.id, reason: '' })}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        </>
                      )}
                      {/* Logistique: prepare */}
                      {(isLogistique || isDirection) && b.status === 'approuve' && (
                        <button className="btn btn--sm btn--secondary" onClick={() => handlePrepare(b.id)}>Préparer</button>
                      )}
                      {/* Logistique: deliver */}
                      {(isLogistique || isDirection) && b.status === 'en_preparation' && (
                        <button className="btn btn--sm btn--primary" style={{ background: 'var(--info)', borderColor: 'var(--info)', color: '#fff' }} onClick={() => handleDeliver(b.id)}>Livré ✓</button>
                      )}
                      {/* Comptable: record */}
                      {(isComptable || isDirection) && b.status === 'livre' && (
                        <button className="btn btn--sm btn--primary" onClick={() => setRecordModal({ id: b.id, cost: String(b.estimated_cost ?? '') })}>Enregistrer</button>
                      )}
                      {/* Comptabilisé: show budget entry link */}
                      {b.status === 'comptabilise' && b.actual_cost && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>{fmt(b.actual_cost)} ✓</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modale de création */}
      {modal && (
        <div className="mr-modal-overlay" onClick={() => setModal(false)}>
          <div className="mr-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Nouvelle demande de besoin</h2>
              <button className="mr-modal__close" aria-label="Fermer" onClick={() => setModal(false)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div className="form-field">
                <label className="form-label">Chantier *</label>
                <select className="form-select" value={form.project_id || ''} onChange={e => setForm({ ...form, project_id: Number(e.target.value) })}>
                  <option value="">— Sélectionner un chantier</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Objet de la demande *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="ex: Ciment CPA 42.5 — 50 sacs urgents" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-field">
                  <label className="form-label">Catégorie *</label>
                  <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as BesoinCategory })}>
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Urgence *</label>
                  <select className="form-select" value={form.urgency} onChange={e => setForm({ ...form, urgency: e.target.value as BesoinUrgency })}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Quantité</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Unité</label>
                  <input className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="sac, m², t, u…" />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Coût estimé (FCFA)</label>
                <input className="form-input" type="number" min="0" value={form.estimated_cost || ''} onChange={e => setForm({ ...form, estimated_cost: parseFloat(e.target.value) || 0 })} placeholder="Estimation budgétaire" />
              </div>
              <div className="form-field">
                <label className="form-label">Description / Justification</label>
                <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Préciser l'utilisation, l'emplacement sur chantier…" />
              </div>
            </div>
            <div className="mr-modal__actions">
              <button className="btn btn--secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn btn--primary" onClick={handleCreate} disabled={saving || !form.project_id || !form.title}>
                {saving ? 'Envoi…' : 'Soumettre la demande'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de rejet */}
      {rejectModal && (
        <div className="mr-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Motif de rejet</h2>
              <button className="mr-modal__close" aria-label="Fermer" onClick={() => setRejectModal(null)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="mr-modal__body">
              <div className="form-field">
                <label className="form-label">Motif *</label>
                <textarea className="form-textarea" rows={3} value={rejectModal.reason} onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })} placeholder="Expliquer le motif du rejet…" autoFocus />
              </div>
            </div>
            <div className="mr-modal__actions">
              <button className="btn btn--secondary" onClick={() => setRejectModal(null)}>Annuler</button>
              <button className="btn btn--danger" onClick={handleReject} disabled={!rejectModal.reason.trim()}>Rejeter</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de détail */}
      {detailModal && (() => {
        const b = detailModal;
        const timeline: { label: string; actor?: string; date?: string | null; note?: string | null; color: string }[] = [
          { label: 'Demande soumise', actor: b.requester?.name, date: b.created_at, color: '#64748b' },
          ...(b.approved_at ? [{ label: 'Approuvée', actor: b.approver?.name, date: b.approved_at, color: '#10b981' }] : []),
          ...(b.rejection_reason ? [{ label: 'Rejetée', note: b.rejection_reason, date: b.approved_at, color: '#ef4444' }] : []),
          ...(b.prepared_at ? [{ label: 'En préparation', actor: b.preparer?.name, date: b.prepared_at, color: '#f59e0b' }] : []),
          ...(b.delivered_at ? [{ label: 'Livrée', date: b.delivered_at, color: '#3b82f6' }] : []),
          ...(b.recorded_at ? [{ label: 'Comptabilisée', actor: b.recorder?.name, date: b.recorded_at, note: b.actual_cost ? `Montant réel : ${fmt(b.actual_cost)}` : null, color: '#8b5cf6' }] : []),
        ];

        return (
          <div className="mr-modal-overlay" onClick={() => setDetailModal(null)}>
            <div className="mr-modal" style={{ maxWidth: 620, width: '95vw' }} onClick={e => e.stopPropagation()}>
              <div className="mr-modal__head">
                <div>
                  <h2 className="mr-modal__title" style={{ marginBottom: 4 }}>{b.title}</h2>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`badge ${STATUS_BADGE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: URGENCY_COLOR[b.urgency], textTransform: 'uppercase' }}>{b.urgency}</span>
                    <span className="badge badge-draft">{CATEGORY_LABEL[b.category]}</span>
                  </div>
                </div>
                <button className="mr-modal__close" aria-label="Fermer" onClick={() => setDetailModal(null)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Infos principales */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chantier</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {b.project ? <>{b.project.code} — {b.project.name}</> : '—'}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demandeur</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{b.requester?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quantité</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{b.quantity ? `${b.quantity} ${b.unit ?? ''}`.trim() : '—'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coût estimé</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>{b.estimated_cost ? fmt(b.estimated_cost) : '—'}</p>
                  </div>
                  {b.actual_cost && (
                    <div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coût réel</p>
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--success)' }}>{fmt(b.actual_cost)}</p>
                    </div>
                  )}
                  {b.budget_entry_id && (
                    <div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entrée budget</p>
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--brand)' }}># {b.budget_entry_id}</p>
                    </div>
                  )}
                </div>

                {b.description && (
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-body)', lineHeight: 1.5 }}>{b.description}</p>
                  </div>
                )}

                {b.notes && (
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-body)', lineHeight: 1.5 }}>{b.notes}</p>
                  </div>
                )}

                {/* Timeline historique */}
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Historique du workflow</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {timeline.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: step.color, marginTop: 4, flexShrink: 0 }} />
                          {i < timeline.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 20 }} />}
                        </div>
                        <div style={{ paddingBottom: 14 }}>
                          <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-body)' }}>{step.label}</p>
                          {step.actor && <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>par {step.actor}</p>}
                          {step.note && <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: step.color }}>{step.note}</p>}
                          {step.date && <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmtDate(step.date)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Modale d'enregistrement de coût */}
      {recordModal && (
        <div className="mr-modal-overlay" onClick={() => setRecordModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Enregistrer le décaissement</h2>
              <button className="mr-modal__close" aria-label="Fermer" onClick={() => setRecordModal(null)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="mr-modal__body">
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                Ce montant sera automatiquement enregistré dans la comptabilité du chantier en tant que paiement.
              </p>
              <div className="form-field">
                <label className="form-label">Montant réel décaissé (FCFA) *</label>
                <input className="form-input" type="number" min="0" autoFocus value={recordModal.cost} onChange={e => setRecordModal({ ...recordModal, cost: e.target.value })} placeholder="Montant exact en FCFA" />
              </div>
            </div>
            <div className="mr-modal__actions">
              <button className="btn btn--secondary" onClick={() => setRecordModal(null)}>Annuler</button>
              <button className="btn btn--primary" onClick={handleRecord} disabled={saving || !recordModal.cost}>
                {saving ? 'Enregistrement…' : 'Comptabiliser'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
