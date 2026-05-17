import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/stores/auth-store';
import {
  fetchSituations, createSituation, submitSituation,
  validateSituation, paySituation, fetchPreviewCalcul,
  approveDtSituation, rejectDtSituation, contestSituation, correctSituation,
  type Situation, type SituationStatut,
} from '../api/get-situations';
import PageHeader from '../../../components/ui/PageHeader';

const STATUT_LABELS: Record<SituationStatut, string> = {
  brouillon:    'Brouillon',
  en_revue_dt:  'En revue DT',
  soumise:      'Soumise',
  contestee:    'Contestée',
  validee_moe:  'Validée MOE',
  payee:        'Payée',
};
const STATUT_COLORS: Record<SituationStatut, string> = {
  brouillon:    '#6b7280',
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
  const isMoe        = ['conducteur-travaux', 'direction', 'directeur-technique'].includes(roleName);
  const isMetreur    = roleName === 'metreur-economiste';

  const { data: situations = [], isLoading } = useQuery({
    queryKey: ['situations', projectId],
    queryFn: () => fetchSituations(projectId),
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['situations', projectId] });

  const createMut    = useMutation({ mutationFn: (d: Parameters<typeof createSituation>[1]) => createSituation(projectId, d), onSuccess: invalidate });
  const submitMut    = useMutation({ mutationFn: (sid: number) => submitSituation(projectId, sid), onSuccess: invalidate });
  const approveDtMut = useMutation({ mutationFn: (sid: number) => approveDtSituation(projectId, sid), onSuccess: invalidate });
  const rejectDtMut  = useMutation({ mutationFn: ({ sid, comment }: { sid: number; comment: string }) => rejectDtSituation(projectId, sid, comment), onSuccess: invalidate });
  const contestMut   = useMutation({ mutationFn: ({ sid, reason }: { sid: number; reason: string }) => contestSituation(projectId, sid, reason), onSuccess: invalidate });
  const correctMut   = useMutation({ mutationFn: (sid: number) => correctSituation(projectId, sid), onSuccess: invalidate });
  const validateMut  = useMutation({ mutationFn: (sid: number) => validateSituation(projectId, sid), onSuccess: invalidate });
  const payMut       = useMutation({ mutationFn: ({ sid, date }: { sid: number; date: string }) => paySituation(projectId, sid, date), onSuccess: invalidate });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ periode: currentMonth(), avancement_pct: 0, notes: '' });
  const [payDate, setPayDate] = useState<Record<number, string>>({});

  // Comment modals for reject-dt and contest
  const [rejectModal, setRejectModal] = useState<{ situationId: number; comment: string } | null>(null);
  const [contestModal, setContestModal] = useState<{ situationId: number; reason: string } | null>(null);

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
                    {s.status === 'brouillon' && s.dt_rejection_comment && (
                      <span style={{ display: 'block', fontSize: '11px', color: '#8b5cf6', marginTop: 2 }}>
                        DT : {s.dt_rejection_comment.slice(0, 60)}{s.dt_rejection_comment.length > 60 ? '…' : ''}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="btp-actions">
                      {/* Métreur: submit brouillon → en_revue_dt */}
                      {s.status === 'brouillon' && (
                        <button
                          className="btn btn--sm btn--secondary"
                          onClick={() => submitMut.mutate(s.id)}
                          disabled={submitMut.isPending}
                        >
                          Soumettre au DT
                        </button>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
