import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/stores/auth-store';
import {
  getProjectAccounting, createSupplier, updateSupplier, deleteSupplier,
  createInvoice, updateInvoice, deleteInvoice,
  validateInvoice, payInvoice,
  invoiceAttachmentUrl, invoicePaymentProofUrl,
  type Supplier, type Invoice, type TypeFacturation,
} from '../api/accounting';
import PageHeader from '../../../components/ui/PageHeader';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import ActivityDetailModal from '../components/ActivityDetailModal';
import { fmtFCFA, fmtFCFAFull as fmtFull } from '../../../lib/formatters';
import { INVOICE_STATUS } from '../../../lib/constants';

const SUPPLIER_CATEGORIES = ['travaux', 'fournitures', 'services', 'sous-traitance', 'location', 'études', 'assurances'];

// Catégories BTP SYSCOHADA-CI (plan comptable OHADA classe 6)
const INVOICE_CATEGORIES = [
  'Gros œuvre',
  'Second œuvre',
  'VRD',
  'Électricité / Plomberie / CVC',
  'Main d\'œuvre',
  'Sous-traitance',
  'Matériaux',
  'Matériel et outillage',
  'Transport et déplacement',
  'Installation de chantier',
  'Études et honoraires',
  'Sécurité et EPI',
  'Assurances chantier',
  'Impôts et taxes',
  'Frais généraux',
  'Autre',
];

const TYPE_FACTURATION_LABEL: Record<string, string> = {
  facture:          'Facture ordinaire',
  situation_travaux:'Situation de travaux',
  acompte:          'Acompte / Avance',
  decompte_final:   'Décompte final',
};

type Tab = 'synthese' | 'factures' | 'fournisseurs';

export default function ProjectAccountingPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { user } = useAuth();
  const isComptable  = user?.role?.name === 'comptable';
  const isDirection  = user?.role?.name === 'direction' || user?.role?.name === 'directeur-technique';

  const queryClient = useQueryClient();
  const [tab, setTab]             = useState<Tab>('synthese');
  const [detailItem, setDetailItem] = useState<{ sourceId: number } | null>(null);

  const [supplierModal, setSupplierModal] = useState<Supplier | null | 'new'>(null);
  const [invoiceModal, setInvoiceModal]   = useState<Invoice | null | 'new'>(null);
  const [paymentModal, setPaymentModal]   = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<{ type: 'supplier' | 'invoice'; id: number } | null>(null);
  const [workflowBusy, setWorkflowBusy]  = useState<number | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['project-accounting', projectId],
    queryFn: () => getProjectAccounting(projectId),
    staleTime: 60_000,
  });

  async function handleValidate(inv: Invoice) {
    setWorkflowBusy(inv.id);
    setWorkflowError(null);
    try {
      await validateInvoice(projectId, inv.id);
      queryClient.invalidateQueries({ queryKey: ['project-accounting', projectId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-operations'] });
    } catch (e: any) {
      setWorkflowError(e?.response?.data?.message ?? 'Erreur lors de la validation.');
    } finally {
      setWorkflowBusy(null);
    }
  }

  if (isLoading) return <div className="page-content"><SkeletonPage rows={3} /></div>;
  if (!data) return <div className="page-content"><p className="form-error">Erreur de chargement.</p></div>;

  const ecartPositif = data.ecart >= 0;
  const racPct = Math.max(0, 100 - data.taux_realisation - data.taux_engagement);

  return (
    <div>
      <PageHeader
        breadcrumb="COMPTABILITÉ CHANTIER"
        title="Tableau de bord comptable"
        subtitle="Budget · Engagements · Réalisé · Coût à Terminaison"
      />

      <div className="page-content">

        {/* Bandeau KPI */}
        <div className="proj-kpi-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '1rem' }}>

          <div className="proj-kpi">
            <div className="proj-kpi__icon proj-kpi__icon--blue">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div className="proj-kpi__body">
              <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmtFCFA(data.budget_ref)} <span style={{ fontSize: 11, fontWeight: 500 }}>FCFA</span></div>
              <div className="proj-kpi__label">Budget de référence · {data.dqe_total > 0 ? 'DQE validé' : 'Marché initial'}</div>
            </div>
          </div>

          <div className="proj-kpi">
            <div className="proj-kpi__icon proj-kpi__icon--orange">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="proj-kpi__body">
              <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmtFCFA(data.engage)} <span style={{ fontSize: 11, fontWeight: 500 }}>FCFA</span></div>
              <div className="proj-kpi__label">Engagements · {data.taux_engagement}% du budget</div>
            </div>
          </div>

          <div className="proj-kpi">
            <div className="proj-kpi__icon proj-kpi__icon--green">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="proj-kpi__body">
              <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmtFCFA(data.realise)} <span style={{ fontSize: 11, fontWeight: 500 }}>FCFA</span></div>
              <div className="proj-kpi__label">Réalisé · {data.taux_realisation}% du budget</div>
            </div>
          </div>

          <div className="proj-kpi">
            <div className="proj-kpi__icon proj-kpi__icon--teal">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div className="proj-kpi__body">
              <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmtFCFA(data.rac)} <span style={{ fontSize: 11, fontWeight: 500 }}>FCFA</span></div>
              <div className="proj-kpi__label">Reste à consommer (RAC)</div>
            </div>
          </div>

          <div className="proj-kpi">
            <div className="proj-kpi__icon proj-kpi__icon--purple">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="proj-kpi__body">
              <div className="proj-kpi__value" style={{ fontSize: 15, color: ecartPositif ? '#059669' : '#dc2626' }}>
                {ecartPositif ? '+' : ''}{fmtFCFA(data.ecart)} <span style={{ fontSize: 11, fontWeight: 500 }}>FCFA</span>
              </div>
              <div className="proj-kpi__label">Écart · CAT {fmtFCFA(data.cat)} FCFA</div>
            </div>
          </div>

        </div>

        {/* Progress bar panel */}
        <div className="acct-panel" style={{ marginBottom: '1.25rem' }}>
          <div className="acct-panel__head">
            <h3 className="acct-panel__title">Avancement budgétaire</h3>
          </div>
          <div style={{ padding: '14px 20px' }}>
            <div className="acct-progress-bar">
              <div className="acct-progress-bar__realise" style={{ width: `${Math.min(data.taux_realisation, 100)}%` }} />
              <div className="acct-progress-bar__engage"  style={{ width: `${Math.min(data.taux_engagement, 100 - data.taux_realisation)}%` }} />
            </div>
            <div className="acct-progress-legend">
              <div className="acct-progress-legend__item">
                <span className="acct-progress-legend__dot" style={{ background: '#10b981' }} />
                <span>Réalisé <strong>{data.taux_realisation}%</strong></span>
              </div>
              <div className="acct-progress-legend__item">
                <span className="acct-progress-legend__dot" style={{ background: '#f59e0b' }} />
                <span>Engagé <strong>{data.taux_engagement}%</strong></span>
              </div>
              <div className="acct-progress-legend__item">
                <span className="acct-progress-legend__dot" style={{ background: '#e2e8f0' }} />
                <span>RAC <strong>{racPct}%</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="dqe-page__toolbar" style={{ marginBottom: 0 }}>
          {(['synthese', 'factures', 'fournisseurs'] as Tab[]).map(t => (
            <button
              key={t}
              className={`dqe-filter-btn ${tab === t ? 'dqe-filter-btn--active' : ''}`}
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
          <div className="acct-panel" style={{ marginTop: 0 }}>
            <div className="acct-panel__head">
              <h3 className="acct-panel__title">Analyse par catégorie</h3>
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
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{vals.count}</td>
                  </tr>
                ))}
                {Object.keys(data.by_category).length === 0 && (
                  <tr><td colSpan={5} className="acct-empty">Aucune facture enregistrée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Factures */}
        {tab === 'factures' && (
          <div className="acct-panel" style={{ marginTop: 0 }}>
            <div className="acct-panel__head">
              <h3 className="acct-panel__title">Factures fournisseurs</h3>
              {isComptable && (
                <button className="btn btn--primary" onClick={() => setInvoiceModal('new')}>+ Nouvelle facture</button>
              )}
            </div>
            {workflowError && (
              <div className="inv-workflow-error" role="alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {workflowError}
                <button type="button" onClick={() => setWorkflowError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>×</button>
              </div>
            )}
            <table className="data-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Fournisseur</th>
                  <th>Type / Catégorie</th>
                  <th style={{ textAlign: 'right' }}>Montant HT</th>
                  <th style={{ textAlign: 'right' }}>Net à payer</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>PJ</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map(inv => {
                  const st = INVOICE_STATUS[inv.status];
                  const busy = workflowBusy === inv.id;
                  return (
                    <tr
                      key={inv.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setDetailItem({ sourceId: inv.id })}
                    >
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{inv.reference}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{inv.supplier?.name ?? '—'}</td>
                      <td>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                          {TYPE_FACTURATION_LABEL[inv.type_facturation] ?? 'Facture ordinaire'}
                        </div>
                        {inv.category}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtFull(inv.amount_ht)}</td>
                      <td style={{ textAlign: 'right', fontSize: 13 }}>
                        {inv.net_a_payer != null && inv.net_a_payer !== inv.amount_ttc
                          ? <span style={{ color: '#f59e0b' }}>{fmtFull(inv.net_a_payer)}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                      <td style={{ fontSize: 13 }}>{new Date(inv.invoice_date).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <span
                          className="acct-status-badge"
                          style={{ background: `${st.color}15`, color: st.color, borderColor: `${st.color}40` }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {inv.attachment_path ? (
                          <a
                            href={invoiceAttachmentUrl(projectId, inv.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inv-attachment-badge"
                            title={inv.attachment_name ?? 'Voir pièce jointe'}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                            {inv.attachment_name && inv.attachment_name.length > 12
                              ? inv.attachment_name.slice(0, 12) + '…'
                              : (inv.attachment_name ?? 'Fichier')}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="table-actions">
                          {/* Workflow: direction/DT valide soumise */}
                          {isDirection && inv.status === 'soumise' && (
                            <button
                              className="btn btn--primary"
                              style={{ fontSize: 11, padding: '3px 10px', height: 'auto' }}
                              disabled={busy}
                              onClick={() => handleValidate(inv)}
                            >
                              {busy ? '…' : 'Valider'}
                            </button>
                          )}
                          {/* Workflow: comptable enregistre paiement sur validee */}
                          {isComptable && inv.status === 'validee' && (() => {
                            const blockers: string[] = [];
                            if (!inv.attachment_path) blockers.push('PJ manquante');
                            if (!inv.purchase_order_id) blockers.push('BDC non lié');
                            return blockers.length > 0 ? (
                              <span
                                className="inv-blocker-badge"
                                title={`Paiement bloqué : ${blockers.join(' · ')}`}
                              >
                                ⚠ {blockers.join(' · ')}
                              </span>
                            ) : (
                              <button
                                className="btn btn--primary"
                                style={{ fontSize: 11, padding: '3px 10px', height: 'auto', whiteSpace: 'nowrap' }}
                                onClick={() => setPaymentModal(inv)}
                              >
                                Paiement
                              </button>
                            );
                          })()}
                          {/* Preuve paiement */}
                          {inv.status === 'payee' && inv.payment_proof_path && (
                            <a
                              href={invoicePaymentProofUrl(projectId, inv.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="inv-attachment-badge"
                              title="Voir preuve de paiement"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              Reçu
                            </a>
                          )}
                          {/* Edit/delete — comptable only, unlocked statuses */}
                          {isComptable && !['validee', 'payee'].includes(inv.status) && (
                            <>
                              <button className="btn-icon btn-icon--edit" onClick={() => setInvoiceModal(inv)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button className="btn-icon btn-icon--delete" onClick={() => setDeleteTarget({ type: 'invoice', id: inv.id })}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {data.invoices.length === 0 && (
                  <tr><td colSpan={8} className="acct-empty">Aucune facture</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Fournisseurs */}
        {tab === 'fournisseurs' && (
          <div className="acct-panel" style={{ marginTop: 0 }}>
            <div className="acct-panel__head">
              <h3 className="acct-panel__title">Fournisseurs & Sous-traitants</h3>
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
                    <td>
                      <span className="acct-status-badge" style={{
                        background: '#64748b15', color: '#475569', borderColor: '#64748b30',
                        textTransform: 'capitalize',
                      }}>
                        {s.category}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtFull(s.contract_amount)}</td>
                    <td style={{ textAlign: 'right', color: '#f59e0b' }}>{fmtFull(s.billed ?? 0)}</td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>{fmtFull(s.paid ?? 0)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
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
                  <tr><td colSpan={7} className="acct-empty">Aucun fournisseur</td></tr>
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
            queryClient.invalidateQueries({ queryKey: ['project-accounting', projectId] });
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
            queryClient.invalidateQueries({ queryKey: ['project-accounting', projectId] });
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
              <button type="button" className="mr-modal__close" aria-label="Fermer" onClick={() => setDeleteTarget(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="mr-modal__body">
              <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)' }}>
                Cette action est irréversible.
              </p>
              <div className="mr-modal__actions">
                <button className="btn btn--secondary" onClick={() => setDeleteTarget(null)}>Annuler</button>
                <button className="btn btn--danger" onClick={async () => {
                  if (deleteTarget.type === 'supplier') await deleteSupplier(projectId, deleteTarget.id);
                  else await deleteInvoice(projectId, deleteTarget.id);
                  queryClient.invalidateQueries({ queryKey: ['project-accounting', projectId] });
                  setDeleteTarget(null);
                }}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {paymentModal && (
        <PaymentModal
          invoice={paymentModal}
          projectId={projectId}
          onSave={async (d) => {
            await payInvoice(projectId, paymentModal.id, d);
            queryClient.invalidateQueries({ queryKey: ['project-accounting', projectId] });
            setPaymentModal(null);
          }}
          onClose={() => setPaymentModal(null)}
        />
      )}

      {/* Invoice detail */}
      {detailItem && (
        <ActivityDetailModal
          type="invoice"
          sourceId={detailItem.sourceId}
          onClose={() => setDetailItem(null)}
        />
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
          <button type="button" className="mr-modal__close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
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

/* ── Payment Modal ──────────────────────────────── */
function PaymentModal({ invoice, projectId: _, onSave, onClose }: {
  invoice: Invoice;
  projectId: number;
  onSave: (d: { paid_date: string; payment_proof: File; note?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [paidDate, setPaidDate] = useState(new Date().toISOString().substring(0, 10));
  const [proof, setProof]       = useState<File | null>(null);
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proof) { setError('La preuve de paiement est obligatoire.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({ paid_date: paidDate, payment_proof: proof, note: note || undefined });
    } catch {
      setError('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mr-modal-overlay" onClick={onClose}>
      <div className="mr-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="mr-modal__head">
          <h2 className="mr-modal__title">Enregistrer le paiement</h2>
          <button type="button" className="mr-modal__close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="inv-pay-summary">
            <span className="inv-pay-summary__ref">{invoice.reference}</span>
            <span className="inv-pay-summary__amount">{Number(invoice.amount_ht).toLocaleString('fr-FR')} FCFA HT</span>
          </div>
          <div className="form-field">
            <label className="form-label">Date de paiement <span style={{ color: '#ef4444' }}>*</span></label>
            <input className="form-input" type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} required />
          </div>
          <div className="form-field">
            <label className="form-label">Preuve de paiement <span style={{ color: '#ef4444' }}>*</span></label>
            <div
              className={`inv-dropzone ${proof ? 'inv-dropzone--has-file' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setProof(f); }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setProof(f); }}
              />
              {proof ? (
                <div className="inv-dropzone__file">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span>{proof.name}</span>
                  <button type="button" className="inv-dropzone__remove" onClick={e => { e.stopPropagation(); setProof(null); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <div className="inv-dropzone__empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  <span>Glisser ou cliquer — PDF, JPG, PNG (max 10 Mo)</span>
                </div>
              )}
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Note (optionnel)</label>
            <textarea className="form-textarea" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Virement, chèque n°…" />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="mr-modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn--primary" disabled={saving || !proof}>
              {saving ? 'Enregistrement…' : 'Confirmer le paiement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Invoice Modal ──────────────────────────────── */
function InvoiceModal({ invoice, suppliers, projectId, onSave, onClose }: {
  invoice: Invoice | null;
  suppliers: Supplier[];
  projectId: number;
  onSave: (d: Partial<Invoice> & { attachment?: File | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    reference:            invoice?.reference ?? '',
    category:             invoice?.category ?? 'Gros œuvre',
    type_facturation:     (invoice?.type_facturation ?? 'facture') as TypeFacturation,
    amount_ht:            invoice?.amount_ht ?? 0,
    vat_rate:             invoice?.vat_rate ?? 18,
    retenue_garantie_pct: invoice?.retenue_garantie_pct ?? 0,
    ras_pct:              invoice?.ras_pct ?? 0,
    invoice_date:         invoice?.invoice_date?.substring(0, 10) ?? new Date().toISOString().substring(0, 10),
    due_date:             invoice?.due_date?.substring(0, 10) ?? '',
    supplier_id:          invoice?.supplier_id ?? '',
    note:                 invoice?.note ?? '',
  });

  // Derived BTP amounts (computed on render)
  const vatAmount  = Math.round(form.amount_ht * form.vat_rate / 100 * 100) / 100;
  const amountTtc  = Math.round((form.amount_ht + vatAmount) * 100) / 100;
  const rdgAmount  = Math.round(amountTtc * form.retenue_garantie_pct / 100 * 100) / 100;
  const rasAmount  = Math.round(amountTtc * form.ras_pct / 100 * 100) / 100;
  const netAPayer  = Math.round((amountTtc - rdgAmount - rasAmount) * 100) / 100;
  const [attachment, setAttachment] = useState<File | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  function handleFile(f: File | null) {
    if (!f) return;
    const ok = ['application/pdf', 'image/jpeg', 'image/png'].includes(f.type) && f.size <= 10 * 1024 * 1024;
    if (ok) setAttachment(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      supplier_id:          form.supplier_id || null,
      due_date:             form.due_date || null,
      amount_ttc:           amountTtc,
      vat_amount:           vatAmount,
      retenue_garantie_amount: rdgAmount,
      ras_amount:           rasAmount,
      net_a_payer:          netAPayer,
      attachment:           attachment,
    };
    try { await onSave(payload as Partial<Invoice> & { attachment?: File | null }); } finally { setSaving(false); }
  }

  return (
    <div className="mr-modal-overlay" onClick={onClose}>
      <div className="mr-modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="mr-modal__head">
          <h2 className="mr-modal__title">{invoice ? 'Modifier facture' : 'Nouvelle facture'}</h2>
          <button type="button" className="mr-modal__close" aria-label="Fermer" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mr-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div className="form-field">
            <label className="form-label">N° Référence</label>
            <input className="form-input" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} required placeholder="FAC-2026-001" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">Type de facturation</label>
              <select className="form-select" value={form.type_facturation} onChange={e => setForm(f => ({ ...f, type_facturation: e.target.value as TypeFacturation }))}>
                {Object.entries(TYPE_FACTURATION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Catégorie BTP</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {INVOICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Fournisseur</label>
            <select className="form-select" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
              <option value="">— Sans fournisseur —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">Montant HT (FCFA)</label>
              <input className="form-input" type="number" min="0" value={form.amount_ht} onChange={e => setForm(f => ({ ...f, amount_ht: Number(e.target.value) }))} required />
            </div>
            <div className="form-field">
              <label className="form-label">TVA (%)</label>
              <input className="form-input" type="number" min="0" max="100" value={form.vat_rate} onChange={e => setForm(f => ({ ...f, vat_rate: Number(e.target.value) }))} />
            </div>
            <div className="form-field">
              <label className="form-label">TTC auto-calculé</label>
              <input className="form-input" type="text" readOnly value={amountTtc.toLocaleString('fr-FR') + ' FCFA'} style={{ background: 'var(--bg-subtle, #f8fafc)', color: 'var(--text-muted)' }} />
            </div>
          </div>
          {/* BTP CI: Retenues réglementaires */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">Retenue de garantie (%)</label>
              <input className="form-input" type="number" min="0" max="100" step="0.5" value={form.retenue_garantie_pct} onChange={e => setForm(f => ({ ...f, retenue_garantie_pct: Number(e.target.value) }))} placeholder="5" />
            </div>
            <div className="form-field">
              <label className="form-label">Retenue à la source DGI (%)</label>
              <input className="form-input" type="number" min="0" max="100" step="0.5" value={form.ras_pct} onChange={e => setForm(f => ({ ...f, ras_pct: Number(e.target.value) }))} placeholder="0" />
            </div>
          </div>
          {(form.retenue_garantie_pct > 0 || form.ras_pct > 0) && (
            <div style={{ background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.625rem 0.875rem', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Montant TTC</span>
                <span>{amountTtc.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {form.retenue_garantie_pct > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                  <span>− Retenue garantie ({form.retenue_garantie_pct}%)</span>
                  <span>−{rdgAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              {form.ras_pct > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                  <span>− RAS DGI ({form.ras_pct}%)</span>
                  <span>−{rasAmount.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 2 }}>
                <span>Net à payer</span>
                <span style={{ color: 'var(--color-primary, #2F60B0)' }}>{netAPayer.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label">Date facture</label>
              <input className="form-input" type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} required />
            </div>
            <div className="form-field">
              <label className="form-label">Échéance</label>
              <input className="form-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Note</label>
            <textarea className="form-textarea" rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>

          <div className="form-field">
            <label className="form-label">Pièce jointe (PDF, JPG, PNG — max 10 Mo)</label>
            <div
              className={`inv-dropzone ${dragOver ? 'inv-dropzone--over' : ''} ${attachment ? 'inv-dropzone--has-file' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0] ?? null); }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files?.[0] ?? null)}
              />
              {attachment ? (
                <div className="inv-dropzone__file">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span>{attachment.name}</span>
                  <button type="button" className="inv-dropzone__remove" onClick={e => { e.stopPropagation(); setAttachment(null); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : invoice?.attachment_name ? (
                <div className="inv-dropzone__existing">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  <a href={invoiceAttachmentUrl(projectId, invoice.id)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                    {invoice.attachment_name}
                  </a>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>— Cliquer pour remplacer</span>
                </div>
              ) : (
                <div className="inv-dropzone__empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  <span>Glisser-déposer ou cliquer pour joindre un reçu</span>
                </div>
              )}
            </div>
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
