import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/stores/auth-store';
import {
  fetchSituations, createSituation, submitSituation,
  validateSituation, paySituation, fetchPreviewCalcul,
  approveCtSituation, rejectCtSituation,
  approveDtSituation, rejectDtSituation, contestSituation, correctSituation,
  type Situation, type SituationStatut, type AvanceSummary, type RetenueSummary,
} from '../api/get-situations';
import PageHeader from '../../../components/ui/PageHeader';
import MdViewerModal from '../../../components/ui/MdViewerModal';

const STATUT_LABELS: Record<SituationStatut, string> = {
  brouillon:    'Brouillon',
  en_revue_ct:  'En revue CT',
  en_revue_dt:  'En revue DT',
  soumise:      'Soumise',
  contestee:    'Contestée',
  validee_moe:  'Validée MOE',
  payee:        'Payée',
};
const STATUT_COLORS: Record<SituationStatut, string> = {
  brouillon:    '#6b7280',
  en_revue_ct:  '#0ea5e9',
  en_revue_dt:  '#8b5cf6',
  soumise:      '#f59e0b',
  contestee:    '#ef4444',
  validee_moe:  '#3b82f6',
  payee:        '#22c55e',
};

function fmt(n: number) {
  return new Intl.NumberFormat('fr-CI', { maximumFractionDigits: 0 }).format(n) + ' XOF';
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function SituationsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const qc = useQueryClient();
  const { user } = useAuth();
  const roleName = user?.role?.name ?? '';
  const isManagement = ['direction', 'directeur-technique'].includes(roleName);
  const isCt         = roleName === 'conducteur-travaux' || isManagement;
  const isMoe        = ['conducteur-travaux', 'direction', 'directeur-technique'].includes(roleName);
  const isMetreur    = roleName === 'metreur-economiste';

  const { data: situationsData, isLoading } = useQuery({
    queryKey: ['situations', projectId],
    queryFn: () => fetchSituations(projectId),
    staleTime: 30_000,
  });
  const situations: Situation[] = situationsData?.situations ?? [];
  const avanceSummary: AvanceSummary | null = situationsData?.avance_summary ?? null;
  const retenueSummary: RetenueSummary | null = situationsData?.retenue_summary ?? null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['situations', projectId] });

  const createMut    = useMutation({ mutationFn: (d: Parameters<typeof createSituation>[1]) => createSituation(projectId, d), onSuccess: invalidate });
  const submitMut    = useMutation({ mutationFn: (sid: number) => submitSituation(projectId, sid), onSuccess: invalidate });
  const approveCtMut = useMutation({ mutationFn: (sid: number) => approveCtSituation(projectId, sid), onSuccess: invalidate });
  const rejectCtMut  = useMutation({ mutationFn: ({ sid, comment }: { sid: number; comment: string }) => rejectCtSituation(projectId, sid, comment), onSuccess: invalidate });
  const approveDtMut = useMutation({ mutationFn: (sid: number) => approveDtSituation(projectId, sid), onSuccess: invalidate });
  const rejectDtMut  = useMutation({ mutationFn: ({ sid, comment }: { sid: number; comment: string }) => rejectDtSituation(projectId, sid, comment), onSuccess: invalidate });
  const contestMut   = useMutation({ mutationFn: ({ sid, reason }: { sid: number; reason: string }) => contestSituation(projectId, sid, reason), onSuccess: invalidate });
  const correctMut   = useMutation({ mutationFn: (sid: number) => correctSituation(projectId, sid), onSuccess: invalidate });
  const validateMut  = useMutation({ mutationFn: (sid: number) => validateSituation(projectId, sid), onSuccess: invalidate });
  const payMut       = useMutation({ mutationFn: ({ sid, date }: { sid: number; date: string }) => paySituation(projectId, sid, date), onSuccess: invalidate });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ periode: currentMonth(), avancement_pct: 0, notes: '' });
  const [payDate, setPayDate] = useState<Record<number, string>>({});

  // Comment modals for reject-ct, reject-dt and contest
  const [rejectCtModal, setRejectCtModal] = useState<{ situationId: number; comment: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ situationId: number; comment: string } | null>(null);
  const [contestModal, setContestModal] = useState<{ situationId: number; reason: string } | null>(null);
  const [mdViewerUrl, setMdViewerUrl] = useState<string | null>(null);

  const { data: preview } = useQuery({
    queryKey: ['situation-preview', projectId, form.avancement_pct],
    queryFn: () => fetchPreviewCalcul(projectId, form.avancement_pct),
    enabled: showForm && form.avancement_pct > 0,
    staleTime: 10_000,
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (preview?.avancement_precedent_pct !== null && form.avancement_pct < (preview?.avancement_precedent_pct ?? 0)) return;
    createMut.mutate({ ...form }, { onSuccess: () => setShowForm(false) });
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Situations de travaux"
        subtitle="Suivi du décompte périodique par période"
        action={
          <button className="btn btn--primary btn--sm" onClick={() => setShowForm(s => !s)}>
            + Nouvelle situation
          </button>
        }
      />

      {/* Avance démarrage widget — visible only when project has an advance configured */}
      {avanceSummary && avanceSummary.accordee > 0 && (
        <div className="card" style={{ display: 'flex', gap: '24px', padding: '16px 20px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 2 }}>Avance démarrage accordée ({avanceSummary.pct}%)</div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{fmt(avanceSummary.accordee)}</div>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 2 }}>Remboursée (situations certifiées)</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#f59e0b' }}>{fmt(avanceSummary.reimbursee)}</div>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 2 }}>Reste à rembourser</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: avanceSummary.reste > 0 ? '#ef4444' : '#22c55e' }}>
              {fmt(avanceSummary.reste)}
            </div>
          </div>
          <div style={{ flex: 2, minWidth: 180, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: 4 }}>
              Progression remboursement
            </div>
            <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: 3,
                background: '#f59e0b',
                width: `${Math.min(100, avanceSummary.accordee > 0 ? (avanceSummary.reimbursee / avanceSummary.accordee) * 100 : 0)}%`,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Retenue de garantie cumulée — visible quand des situations existent */}
      {retenueSummary && retenueSummary.cumulee > 0 && (
        <div className="card" style={{ display: 'flex', gap: '24px', padding: '16px 20px', marginBottom: '16px', flexWrap: 'wrap', borderLeft: '3px solid #8b5cf6' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 2 }}>Retenue de garantie ({retenueSummary.pct}%) — cumulée toutes situations</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#8b5cf6' }}>{fmt(retenueSummary.cumulee)}</div>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 2 }}>Libérable à la réception définitive</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: retenueSummary.liberable > 0 ? '#22c55e' : 'var(--color-text-muted)' }}>
              {fmt(retenueSummary.liberable)}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: 2 }}>Encore retenue</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#ef4444' }}>
              {fmt(retenueSummary.cumulee - retenueSummary.liberable)}
            </div>
          </div>
        </div>
      )}

      {/* Gap C: alert when avance pct configured but not yet frozen */}
      {avanceSummary && avanceSummary.pct > 0 && !avanceSummary.is_frozen && isManagement && (
        <div className="btp-alert btp-alert--warning" style={{ marginBottom: 12 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            Avance de démarrage ({avanceSummary.pct}%) calculée dynamiquement — le montant n'est pas encore gelé.
            Allez dans les paramètres du projet pour figer le montant accordé et éviter toute dérive sur modification du marché.
          </span>
        </div>
      )}

      {/* Reject CT modal */}
      {rejectCtModal && (
        <div className="modal-overlay" onClick={() => setRejectCtModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Rejeter (Conducteur de travaux)</h3>
            <div className="form-group">
              <label className="form-label">Motif de rejet terrain *</label>
              <textarea
                className="form-control"
                rows={4}
                value={rejectCtModal.comment}
                onChange={e => setRejectCtModal(m => m ? { ...m, comment: e.target.value } : null)}
                placeholder="Incohérence avancement, ouvrage non terminé…"
              />
            </div>
            <div className="form-actions">
              <button
                className="btn btn--danger btn--sm"
                disabled={!rejectCtModal.comment.trim() || rejectCtMut.isPending}
                onClick={() => {
                  rejectCtMut.mutate(
                    { sid: rejectCtModal.situationId, comment: rejectCtModal.comment },
                    { onSuccess: () => setRejectCtModal(null) },
                  );
                }}
              >
                {rejectCtMut.isPending ? 'Enregistrement…' : 'Rejeter'}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setRejectCtModal(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject DT modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Rejeter la situation (DT)</h3>
            <div className="form-group">
              <label className="form-label">Motif de rejet *</label>
              <textarea
                className="form-control"
                rows={4}
                value={rejectModal.comment}
                onChange={e => setRejectModal(m => m ? { ...m, comment: e.target.value } : null)}
                placeholder="Décrivez le problème à corriger…"
              />
            </div>
            <div className="form-actions">
              <button
                className="btn btn--danger btn--sm"
                disabled={!rejectModal.comment.trim() || rejectDtMut.isPending}
                onClick={() => {
                  rejectDtMut.mutate(
                    { sid: rejectModal.situationId, comment: rejectModal.comment },
                    { onSuccess: () => setRejectModal(null) },
                  );
                }}
              >
                {rejectDtMut.isPending ? 'Enregistrement…' : 'Rejeter'}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setRejectModal(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Contest modal */}
      {contestModal && (
        <div className="modal-overlay" onClick={() => setContestModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Contester la situation</h3>
            <div className="form-group">
              <label className="form-label">Motif de contestation *</label>
              <textarea
                className="form-control"
                rows={4}
                value={contestModal.reason}
                onChange={e => setContestModal(m => m ? { ...m, reason: e.target.value } : null)}
                placeholder="Décrivez le problème à corriger…"
              />
            </div>
            <div className="form-actions">
              <button
                className="btn btn--danger btn--sm"
                disabled={!contestModal.reason.trim() || contestMut.isPending}
                onClick={() => {
                  contestMut.mutate(
                    { sid: contestModal.situationId, reason: contestModal.reason },
                    { onSuccess: () => setContestModal(null) },
                  );
                }}
              >
                {contestMut.isPending ? 'Enregistrement…' : 'Contester'}
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setContestModal(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form className="card card--form" onSubmit={handleCreate}>
          <h3 className="card__title">Créer une situation de travaux</h3>
          <div className="form-grid form-grid--2">
            <div className="form-group">
              <label className="form-label">Période *</label>
              <input
                type="month"
                className="form-control"
                value={form.periode}
                onChange={e => setForm(f => ({ ...f, periode: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Avancement cumulé (%)</label>
              <input
                type="number"
                className="form-control"
                min={preview?.avancement_precedent_pct ?? 0}
                max={100} step={1}
                value={form.avancement_pct}
                onChange={e => setForm(f => ({ ...f, avancement_pct: parseFloat(e.target.value) || 0 }))}
              />
              {preview?.progress_from_journal != null && (
                <span className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Journal terrain : {preview.progress_from_journal}%
                  {preview.last_log_date && (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                      (basé sur dernier journal du {new Date(preview.last_log_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })})
                    </span>
                  )}
                  {form.avancement_pct !== preview.progress_from_journal && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{ fontSize: '11px', padding: '1px 8px' }}
                      onClick={() => setForm(f => ({ ...f, avancement_pct: preview.progress_from_journal! }))}
                    >
                      Utiliser
                    </button>
                  )}
                </span>
              )}
              {preview?.avancement_precedent_pct != null && (
                <span className="form-hint">
                  Précédent certifié : {preview.avancement_precedent_pct}%
                  {form.avancement_pct < preview.avancement_precedent_pct && (
                    <span style={{ color: '#ef4444', marginLeft: 8 }}>⚠ Régression interdite</span>
                  )}
                </span>
              )}
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Montant brut HT calculé</label>
              <div className="form-control" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', cursor: 'default', fontWeight: 600 }}>
                {preview ? fmt(preview.montant_brut_ht) : '—'}
              </div>
              {preview && (
                <span className="form-hint">
                  Base = {fmt(preview.base_calcul)}
                  {preview.avenants_signes_sum > 0 && ` (dont ${fmt(preview.avenants_signes_sum)} avenants signés)`}
                  {' × '}{form.avancement_pct}%
                  {preview.type_marche === 'forfait' && (
                    <span style={{ display: 'block', marginTop: 4, color: 'var(--color-warning, #f59e0b)', fontWeight: 500 }}>
                      Marché à forfait — base = montant du marché (les lignes DQE ne sont pas utilisées pour le calcul)
                    </span>
                  )}
                  {preview.avance_demarrage_montant > 0 && (
                    <span style={{ display: 'block', marginTop: 2 }}>
                      Avance démarrage : {fmt(preview.avance_demarrage_montant)} ({preview.avance_demarrage_pct}%)
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input
                type="text"
                className="form-control"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={createMut.isPending}>
              {createMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="page-loading">Chargement…</p>
      ) : situations.length === 0 ? (
        <p className="page-empty">Aucune situation enregistrée. Créez la première via le bouton ci-dessus.</p>
      ) : (
        <div className="card card--table">
          <table className="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Période</th>
                <th>Avancement</th>
                <th>Δ période</th>
                <th>Montant période</th>
                <th>Brut HT</th>
                <th>Cumul précédent</th>
                <th>Retenue</th>
                <th>Avance déduite</th>
                <th>Net à payer</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {situations.map((s: Situation) => (
                <tr key={s.id}>
                  <td><strong>{s.numero}</strong></td>
                  <td>{s.periode}</td>
                  <td>
                    {s.avancement_pct}%
                    {s.avancement_precedent_pct != null && (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginLeft: 4 }}>
                        (/{s.avancement_precedent_pct}%)
                      </span>
                    )}
                  </td>
                  <td style={{ color: s.delta_pct > 0 ? '#22c55e' : '#ef4444' }}>
                    {s.delta_pct > 0 ? '+' : ''}{s.delta_pct}%
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
                    {s.delta_montant_ht > 0 ? '+' : ''}{fmt(s.delta_montant_ht)}
                  </td>
                  <td>{fmt(s.montant_brut_ht)}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{fmt(s.cumul_precedent_ht)}</td>
                  <td>{fmt(s.retenue_garantie_amount)}</td>
                  <td style={{ color: s.avance_remboursement > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                    {s.avance_remboursement > 0 ? `−${fmt(s.avance_remboursement)}` : '—'}
                  </td>
                  <td><strong>{fmt(s.net_a_payer)}</strong></td>
                  <td>
                    <span
                      className="btp-statut-badge"
                      style={{ background: STATUT_COLORS[s.status] + '22', color: STATUT_COLORS[s.status] }}
                    >
                      {STATUT_LABELS[s.status]}
                    </span>
                    {s.status === 'contestee' && s.contest_reason && (
                      <span style={{ display: 'block', fontSize: '11px', color: '#ef4444', marginTop: 2 }}>
                        {s.contest_reason.slice(0, 60)}{s.contest_reason.length > 60 ? '…' : ''}
                      </span>
                    )}
                    {s.status === 'brouillon' && s.ct_rejection_comment && (
                      <span style={{ display: 'block', fontSize: '11px', color: '#0ea5e9', marginTop: 2 }}>
                        CT : {s.ct_rejection_comment.slice(0, 60)}{s.ct_rejection_comment.length > 60 ? '…' : ''}
                      </span>
                    )}
                    {s.status === 'brouillon' && s.dt_rejection_comment && !s.ct_rejection_comment && (
                      <span style={{ display: 'block', fontSize: '11px', color: '#8b5cf6', marginTop: 2 }}>
                        DT : {s.dt_rejection_comment.slice(0, 60)}{s.dt_rejection_comment.length > 60 ? '…' : ''}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="btp-actions">
                      {/* Métreur: submit brouillon → en_revue_ct */}
                      {s.status === 'brouillon' && (
                        <button
                          className="btn btn--sm btn--secondary"
                          onClick={() => submitMut.mutate(s.id)}
                          disabled={submitMut.isPending}
                        >
                          Soumettre au CT
                        </button>
                      )}

                      {/* CT/direction: approve en_revue_ct → en_revue_dt */}
                      {s.status === 'en_revue_ct' && isCt && (
                        <>
                          <button
                            className="btn btn--sm btn--primary"
                            onClick={() => approveCtMut.mutate(s.id)}
                            disabled={approveCtMut.isPending}
                          >
                            Valider CT
                          </button>
                          <button
                            className="btn btn--sm btn--danger"
                            onClick={() => setRejectCtModal({ situationId: s.id, comment: '' })}
                          >
                            Rejeter CT
                          </button>
                        </>
                      )}

                      {/* DT/direction: approve en_revue_dt → soumise */}
                      {s.status === 'en_revue_dt' && isManagement && (
                        <>
                          <button
                            className="btn btn--sm btn--primary"
                            onClick={() => approveDtMut.mutate(s.id)}
                            disabled={approveDtMut.isPending}
                          >
                            Approuver DT
                          </button>
                          <button
                            className="btn btn--sm btn--danger"
                            onClick={() => setRejectModal({ situationId: s.id, comment: '' })}
                          >
                            Rejeter
                          </button>
                        </>
                      )}

                      {/* MOE: validate soumise → validee_moe */}
                      {s.status === 'soumise' && isMoe && (
                        <>
                          <button
                            className="btn btn--sm btn--primary"
                            onClick={() => validateMut.mutate(s.id)}
                            disabled={validateMut.isPending}
                          >
                            Valider MOE
                          </button>
                          <button
                            className="btn btn--sm btn--danger"
                            onClick={() => setContestModal({ situationId: s.id, reason: '' })}
                          >
                            Contester
                          </button>
                        </>
                      )}

                      {/* Métreur: correct contestee → brouillon */}
                      {s.status === 'contestee' && (isMetreur || isManagement) && (
                        <button
                          className="btn btn--sm btn--secondary"
                          onClick={() => correctMut.mutate(s.id)}
                          disabled={correctMut.isPending}
                        >
                          Corriger
                        </button>
                      )}

                      {/* Comptable/direction: pay validee_moe → payee */}
                      {s.status === 'validee_moe' && (
                        <div className="btp-pay-row">
                          <input
                            type="date"
                            className="form-control form-control--sm"
                            value={payDate[s.id] ?? ''}
                            onChange={e => setPayDate(d => ({ ...d, [s.id]: e.target.value }))}
                          />
                          <button
                            className="btn btn--sm btn--success"
                            onClick={() => payDate[s.id] && payMut.mutate({ sid: s.id, date: payDate[s.id] })}
                            disabled={!payDate[s.id] || payMut.isPending}
                          >
                            Payer
                          </button>
                        </div>
                      )}

                      {/* PDF export — soumise excluded: still contestable, must not circulate as official */}
                      {(s.status === 'validee_moe' || s.status === 'payee') && (
                        <a
                          href={`http://localhost:8000/api/projects/${projectId}/situations/${s.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn--sm btn--ghost"
                          title="Télécharger PDF"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          PDF
                        </a>
                      )}
                      {s.md_url && (
                        <button
                          className="btn btn--sm btn--ghost"
                          title="Voir rapport IA"
                          onClick={() => setMdViewerUrl(s.md_url)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                          Rapport
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mdViewerUrl && (
        <MdViewerModal
          url={mdViewerUrl}
          title="Rapport Situation de Travaux"
          onClose={() => setMdViewerUrl(null)}
        />
      )}
    </div>
  );
}
