import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import {
  getPortfolioAccounting,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  type GeneralExpense,
} from '../api/portfolio-accounting';
import { useAuth } from '../../auth/stores/auth-store';
import PageHeader from '../../../components/ui/PageHeader';
import ActivityDetailModal from '../components/ActivityDetailModal';
import { fmtFCFA as fmt, fmtDate } from '../../../lib/formatters';
import {
  INVOICE_STATUS_LABEL as STATUS_LABEL,
  INVOICE_STATUS_COLOR as STATUS_COLOR,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_COLOR,
  EXPENSE_STATUS_LABEL,
  EXPENSE_STATUS_COLOR,
} from '../../../lib/constants';
// Frais généraux d'entreprise (siège) — distincts des charges de chantier
const EXPENSE_CATEGORIES: Record<string, string> = {
  transport:          'Transport & déplacement',
  hebergement:        'Hébergement',
  restauration:       'Restauration',
  fournitures:        'Fournitures bureau',
  communication:      'Communication & internet',
  salaires:           'Salaires & charges',
  cnps:               'CNPS & cotisations',
  impots:             'Impôts & patente (DGI)',
  loyer:              'Loyer & charges bureau',
  assurances:         'Assurances entreprise',
  materiel:           'Matériel & équipements',
  sous_traitance:     'Sous-traitance générale',
  honoraires:         'Honoraires & conseils',
  charges:            'Charges diverses',
  autre:              'Autre',
};

const EMPTY_EXPENSE = {
  category: 'transport', label: '', amount: 0,
  expense_date: new Date().toISOString().slice(0, 10), paid_by: '', notes: '',
};

export default function AccountingDashboardPage() {
  const { user } = useAuth();
  const isComptable = user?.role?.name === 'comptable';
  const isApprover  = ['direction', 'directeur-technique'].includes(user?.role?.name ?? '');

  const queryClient = useQueryClient();
  const [detailItem, setDetailItem] = useState<{ type: string; sourceId: number } | null>(null);
  const [modal, setModal]       = useState<Partial<GeneralExpense> | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch]     = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: number; reason: string } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio-accounting'],
    queryFn: getPortfolioAccounting,
    staleTime: 60_000,
  });

  const handleSaveExpense = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.id) await updateExpense(modal.id, modal);
      else          await createExpense(modal);
      setModal(null);
      queryClient.invalidateQueries({ queryKey: ['portfolio-accounting'] });
    } finally { setSaving(false); }
  };

  const handleDeleteExpense = async () => {
    if (!deleteId) return;
    await deleteExpense(deleteId);
    setDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ['portfolio-accounting'] });
  };

  const handleApprove = async (id: number) => {
    await approveExpense(id);
    queryClient.invalidateQueries({ queryKey: ['portfolio-accounting'] });
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectModal.reason.trim()) return;
    await rejectExpense(rejectModal.id, rejectModal.reason);
    setRejectModal(null);
    queryClient.invalidateQueries({ queryKey: ['portfolio-accounting'] });
  };

  if (isLoading) return <div className="page-content"><SkeletonPage rows={3} /></div>;
  if (isError || !data) return <p style={{ padding: 40, color: 'var(--text-muted)', textAlign: 'center' }}>Impossible de charger les données comptables.</p>;

  const { totals, projects, recent_activity, expenses } = data;

  const q = search.toLowerCase().trim();
  const filteredProjects = q
    ? projects.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
    : projects;

  const pendingExpenses = expenses.filter(e => e.status === 'en_attente');

  return (
    <div>
      <PageHeader
        title="Comptabilité"
        subtitle="Engagements · Réalisé · Reste à consommer · Décaissements"
        action={
          isComptable ? (
            <button type="button" className="btn-primary" onClick={() => setModal({ ...EMPTY_EXPENSE })}>
              + Décaissement hors projet
            </button>
          ) : undefined
        }
      />

      {/* Bandeau approbations en attente */}
      {isApprover && pendingExpenses.length > 0 && (
        <div className="acct-pending-banner" style={{ marginBottom: 16 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <strong>{pendingExpenses.length} décaissement{pendingExpenses.length > 1 ? 's' : ''} en attente d'approbation</strong>
          <span>— votre validation est requise avant exécution</span>
          <a href="#decaissements" className="acct-pending-banner__link">Voir ↓</a>
        </div>
      )}

      {/* Bandeau KPI */}
      <div className="proj-kpi-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmt(totals.budget_ref)}</div>
            <div className="proj-kpi__label">Budget de référence</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmt(totals.engage)}</div>
            <div className="proj-kpi__label">Engagements · {totals.taux_engage}%</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmt(totals.realise)}</div>
            <div className="proj-kpi__label">Réalisé chantiers · {totals.taux_realise}%</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--teal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmt(totals.rac)}</div>
            <div className="proj-kpi__label">Reste à consommer</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className={`proj-kpi__icon ${pendingExpenses.length > 0 ? 'proj-kpi__icon--red' : 'proj-kpi__icon--green'}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{pendingExpenses.length}</div>
            <div className="proj-kpi__label">
              {pendingExpenses.length > 0
                ? `${fmt(pendingExpenses.reduce((s, e) => s + e.amount, 0))} à valider`
                : 'Aucun en attente'}
            </div>
          </div>
        </div>
      </div>

      {/* Corps principal — chantiers à gauche (1fr), activité à droite (300px) */}
      <div className="acct-body">

        {/* Cartes chantiers */}
        <div className="acct-projects">
          <div className="acct-panel__head">
            <h2 className="acct-panel__title">Chantiers</h2>
            <span className="acct-panel__count">{filteredProjects.length}/{projects.length}</span>
          </div>
          <div className="acct-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="acct-search-icon">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="acct-search-input"
              placeholder="Rechercher un chantier…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="acct-search-clear" onClick={() => setSearch('')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
          <div className="acct-project-list">
            {filteredProjects.length === 0 && (
              <p className="acct-empty">Aucun chantier trouvé pour « {search} »</p>
            )}
            {filteredProjects.map((p) => {
              const barRealise  = Math.min(100, p.taux_realise);
              const barEngage   = Math.min(100 - barRealise, p.taux_engage);
              const statusColor = PROJECT_STATUS_COLOR[p.status] ?? '#94a3b8';
              return (
                <Link key={p.id} to={`/projects/${p.id}/accounting`} className="acct-proj-card">
                  <div className="acct-proj-card__top">
                    <div>
                      <span className="acct-proj-card__code">{p.code}</span>
                      <span className="acct-proj-card__status" style={{ background: `${statusColor}18`, color: statusColor }}>
                        {PROJECT_STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ color: 'var(--text-muted)' }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </div>
                  <p className="acct-proj-card__name">{p.name}</p>
                  <div className="acct-proj-card__bar-track">
                    <div className="acct-proj-card__bar-realise" style={{ width: `${barRealise}%` }} />
                    <div className="acct-proj-card__bar-engage"  style={{ width: `${barEngage}%` }} />
                  </div>
                  <div className="acct-proj-card__stats">
                    <div>
                      <span className="acct-proj-stat__label">Budget ref</span>
                      <span className="acct-proj-stat__val">{fmt(p.budget_ref)}</span>
                    </div>
                    <div>
                      <span className="acct-proj-stat__label">Réalisé</span>
                      <span className="acct-proj-stat__val">{fmt(p.realise)}</span>
                    </div>
                    <div>
                      <span className="acct-proj-stat__label">Écart</span>
                      <span className="acct-proj-stat__val" style={{ color: p.ecart >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {p.ecart >= 0 ? '+' : ''}{fmt(p.ecart)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Fil d'activité */}
        <div className="acct-panel">
          <div className="acct-panel__head">
            <h2 className="acct-panel__title">Activité récente</h2>
            <span className="acct-panel__count">{recent_activity.length} opérations</span>
          </div>
          <div className="acct-feed">
            {recent_activity.length === 0 && (
              <p className="acct-empty">Aucune opération enregistrée</p>
            )}
            {recent_activity.map((item) => (
              <div
                key={item.id}
                className="acct-feed__row acct-feed__row--clickable"
                onClick={() => item.source_id && setDetailItem({ type: item.type, sourceId: item.source_id })}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && item.source_id && setDetailItem({ type: item.type, sourceId: item.source_id })}
              >
                <div className={`acct-feed__icon ${item.type === 'invoice' ? 'acct-feed__icon--inv' : item.type === 'budget_entry' ? 'acct-feed__icon--be' : 'acct-feed__icon--exp'}`}>
                  {item.type === 'invoice' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  ) : item.type === 'budget_entry' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  )}
                </div>
                <div className="acct-feed__info">
                  <span className="acct-feed__ref">{item.reference ?? item.label}</span>
                  <span className="acct-feed__meta">
                    {item.project_name
                      ? <Link to={`/projects/${item.project_id}/accounting`} className="acct-feed__link">{item.project_code}</Link>
                      : <span className="acct-feed__hors">Hors projet</span>
                    }
                    · {EXPENSE_CATEGORIES[item.category] ?? item.category}
                  </span>
                </div>
                <div className="acct-feed__right">
                  <span className="acct-feed__amount">{fmt(item.amount)}</span>
                  {item.status ? (
                    <span className="acct-feed__badge" style={{ background: `${STATUS_COLOR[item.status]}18`, color: STATUS_COLOR[item.status] }}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  ) : (
                    <span className="acct-feed__date">{fmtDate(item.date)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Tableau décaissements hors projet */}
      <div className="acct-panel acct-panel--full" id="decaissements">
        <div className="acct-panel__head">
          <div>
            <h2 className="acct-panel__title">Décaissements hors projet</h2>
            <p className="acct-panel__desc">Frais généraux non rattachés à un chantier — toute dépense requiert une approbation</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="acct-panel__count">
              Total approuvé : <strong>{fmt(expenses.filter(e => e.status === 'approuvee').reduce((s, e) => s + e.amount, 0))}</strong>
            </span>
            <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setModal({ ...EMPTY_EXPENSE })}>
              + Nouveau décaissement
            </button>
          </div>
        </div>
        <div className="acct-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Catégorie</th>
                <th>Libellé</th>
                <th>Payé par</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Soumis par</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && (
                <tr><td colSpan={8} className="acct-empty">Aucun décaissement hors projet</td></tr>
              )}
              {expenses.map((exp) => {
                const sc = EXPENSE_STATUS_COLOR[exp.status] ?? '#94a3b8';
                return (
                  <tr key={exp.id} className={exp.status === 'en_attente' ? 'acct-table__row--pending' : ''}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(exp.expense_date)}</td>
                    <td><span className="badge badge-draft">{EXPENSE_CATEGORIES[exp.category] ?? exp.category}</span></td>
                    <td>
                      <span>{exp.label}</span>
                      {exp.status === 'rejetee' && exp.rejection_reason && (
                        <p className="acct-rejection-reason">Motif : {exp.rejection_reason}</p>
                      )}
                    </td>
                    <td>{exp.paid_by ?? '—'}</td>
                    <td><strong>{fmt(exp.amount)}</strong></td>
                    <td>
                      <span className="acct-status-badge" style={{ background: `${sc}15`, color: sc, borderColor: `${sc}40` }}>
                        {exp.status === 'en_attente' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        )}
                        {exp.status === 'approuvee' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                        {exp.status === 'rejetee' && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        )}
                        {EXPENSE_STATUS_LABEL[exp.status]}
                      </span>
                      {exp.approver && (
                        <p className="acct-approver-name">par {exp.approver.name}</p>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {exp.creator?.name ?? '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {isApprover && exp.status === 'en_attente' && (
                          <>
                            <button type="button" className="btn btn--sm acct-btn--approve" onClick={() => handleApprove(exp.id)} title="Approuver">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
                              Approuver
                            </button>
                            <button type="button" className="btn btn--sm acct-btn--reject" onClick={() => setRejectModal({ id: exp.id, reason: '' })} title="Rejeter">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              Rejeter
                            </button>
                          </>
                        )}
                        {isComptable && exp.status === 'en_attente' && (
                          <button type="button" className="btn-icon btn-icon--edit" onClick={() => setModal({ ...exp })} title="Modifier">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        )}
                        {isComptable && exp.status !== 'approuvee' && (
                          <button type="button" className="btn-icon btn-icon--delete" onClick={() => setDeleteId(exp.id)} title="Supprimer">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
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
      </div>

      {/* Modale décaissement */}
      {modal !== null && (
        <div className="mr-modal-overlay" onClick={() => setModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">{modal.id ? 'Modifier le décaissement' : 'Nouveau décaissement hors projet'}</h2>
              <button type="button" className="mr-modal__close" aria-label="Fermer" onClick={() => setModal(null)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-field">
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input" value={modal.expense_date ?? ''} onChange={e => setModal({ ...modal, expense_date: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Catégorie *</label>
                  <select className="form-select" value={modal.category ?? 'transport'} onChange={e => setModal({ ...modal, category: e.target.value })}>
                    {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Libellé *</label>
                <input type="text" className="form-input" placeholder="ex: Transport DT vers plateau" value={modal.label ?? ''} onChange={e => setModal({ ...modal, label: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-field">
                  <label className="form-label">Montant (FCFA) *</label>
                  <input type="number" className="form-input" min={0} value={modal.amount ?? ''} onChange={e => setModal({ ...modal, amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-field">
                  <label className="form-label">Payé par</label>
                  <input type="text" className="form-input" placeholder="ex: DT Charles" value={modal.paid_by ?? ''} onChange={e => setModal({ ...modal, paid_by: e.target.value })} />
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} placeholder="Détails supplémentaires…" value={modal.notes ?? ''} onChange={e => setModal({ ...modal, notes: e.target.value })} />
              </div>
              {!modal.id && (
                <div className="acct-approval-notice">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Ce décaissement sera soumis en attente d'approbation par la Direction ou le DT.
                </div>
              )}
            </div>
            <div className="mr-modal__actions">
              <button type="button" className="btn btn--secondary" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn btn--primary" onClick={handleSaveExpense} disabled={saving || !modal.label || !modal.amount}>
                {saving ? 'Enregistrement…' : modal.id ? 'Modifier' : 'Soumettre pour approbation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale motif de rejet */}
      {rejectModal !== null && (
        <div className="mr-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="mr-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Motif de rejet</h2>
              <button type="button" className="mr-modal__close" aria-label="Fermer" onClick={() => setRejectModal(null)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="mr-modal__body">
              <div className="form-field">
                <label className="form-label">Expliquez le motif *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="ex: Montant anormalement élevé, justificatif insuffisant…"
                  value={rejectModal.reason}
                  onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  autoFocus
                />
              </div>
            </div>
            <div className="mr-modal__actions">
              <button type="button" className="btn btn--secondary" onClick={() => setRejectModal(null)}>Annuler</button>
              <button className="btn btn--danger" onClick={handleReject} disabled={!rejectModal.reason.trim()}>
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation de suppression */}
      {deleteId !== null && (
        <div className="mr-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="mr-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="mr-modal__head">
              <h2 className="mr-modal__title">Supprimer ce décaissement ?</h2>
              <button type="button" className="mr-modal__close" aria-label="Fermer" onClick={() => setDeleteId(null)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="mr-modal__body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cette action est irréversible.</p>
            </div>
            <div className="mr-modal__actions">
              <button type="button" className="btn btn--secondary" onClick={() => setDeleteId(null)}>Annuler</button>
              <button className="btn btn--danger" onClick={handleDeleteExpense}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {detailItem && (
        <ActivityDetailModal
          type={detailItem.type}
          sourceId={detailItem.sourceId}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}
