import { useEffect, useState } from 'react';
import PageHeader from '../../../components/ui/PageHeader';
import { useAuth } from '../../auth/stores/auth-store';
import {
  getBesoins, createBesoin, approveBesoin, rejectBesoin,
  prepareBesoin, deliverBesoin, recordBesoin,
  CATEGORY_LABEL, URGENCY_COLOR, STATUS_LABEL, STATUS_BADGE,
  type DemandeBesoin, type BesoinCategory, type BesoinUrgency,
} from '../api/besoins';
import { listProjects } from '../../projects/api/list-projects';
import type { Project } from '../../projects/types';

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

  const [besoins, setBesoins]   = useState<DemandeBesoin[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: number; reason: string } | null>(null);
  const [recordModal, setRecordModal] = useState<{ id: number; cost: string } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getBesoins(), canCreate ? listProjects() : Promise.resolve([])])
      .then(([b, p]) => { setBesoins(b); setProjects(p); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

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
      load();
    } finally { setSaving(false); }
  };

  const handleApprove = async (id: number) => {
    await approveBesoin(id);
    load();
  };

  const handleReject = async () => {
    if (!rejectModal?.reason.trim()) return;
    await rejectBesoin(rejectModal.id, rejectModal.reason);
    setRejectModal(null);
    load();
  };

  const handlePrepare = async (id: number) => {
    await prepareBesoin(id);
    load();
  };

  const handleDeliver = async (id: number) => {
    await deliverBesoin(id);
    load();
  };

  const handleRecord = async () => {
    if (!recordModal) return;
    const cost = parseFloat(recordModal.cost);
    if (!cost || cost <= 0) return;
    setSaving(true);
    try {
      await recordBesoin(recordModal.id, cost);
      setRecordModal(null);
      load();
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

      {/* Table panel */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Filter toolbar */}
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

        {loading ? <p style={{ padding: 24, color: 'var(--text-muted)' }}>Chargement…</p> : (
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
                <tr key={b.id}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>{b.title}</span>
                    {b.requester && <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>par {b.requester.name}</p>}
                    {b.rejection_reason && <p style={{ margin: 0, fontSize: '0.75rem', color: '#ef4444' }}>↳ {b.rejection_reason}</p>}
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
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                      {/* Direction: approve / reject */}
                      {isDirection && b.status === 'soumis' && (
                        <>
                          <button className="btn btn--sm btn--primary" style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }} onClick={() => handleApprove(b.id)}>✓</button>
                          <button className="btn btn--sm btn--danger" onClick={() => setRejectModal({ id: b.id, reason: '' })}>✕</button>
                        </>
                      )}
                      {/* Logistique: prepare */}
                      {(isLogistique || isDirection) && b.status === 'approuve' && (
                        <button className="btn btn--sm btn--secondary" onClick={() => handlePrepare(b.id)}>Préparer</button>
                      )}
                      {/* Logistique: deliver */}
                      {(isLogistique || isDirection) && b.status === 'en_preparation' && (
                        <button className="btn btn--sm btn--primary" style={{ background: '#0891b2', borderColor: '#0891b2', color: '#fff' }} onClick={() => handleDeliver(b.id)}>Livré ✓</button>
                      )}
                      {/* Comptable: record */}
                      {(isComptable || isDirection) && b.status === 'livre' && (
                        <button className="btn btn--sm btn--primary" onClick={() => setRecordModal({ id: b.id, cost: String(b.estimated_cost ?? '') })}>Enregistrer</button>
                      )}
                      {/* Comptabilisé: show budget entry link */}
                      {b.status === 'comptabilise' && b.actual_cost && (
                        <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>{fmt(b.actual_cost)} ✓</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {modal && (
        <div className="mr-modal-overlay" onClick={() => setModal(false)}>
          <div className="mr-modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Nouvelle demande de besoin</h2>
              <button className="mr-modal__close" onClick={() => setModal(false)}>✕</button>
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

      {/* Reject modal */}
      {rejectModal && (
        <div className="mr-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Motif de rejet</h2>
              <button className="mr-modal__close" onClick={() => setRejectModal(null)}>✕</button>
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

      {/* Record cost modal */}
      {recordModal && (
        <div className="mr-modal-overlay" onClick={() => setRecordModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Enregistrer le décaissement</h2>
              <button className="mr-modal__close" onClick={() => setRecordModal(null)}>✕</button>
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
