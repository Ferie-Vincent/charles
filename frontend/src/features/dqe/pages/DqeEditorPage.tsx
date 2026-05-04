import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SkeletonPage from '../../../components/ui/SkeletonPage';
import {
  getDqeVersion,
  createDqeLine,
  updateDqeLine,
  deleteDqeLine,
  transitionDqeVersion,
  downloadDqePdf,
  duplicateDqeVersion,
} from '../api/dqe-api';
import { UNITES_BTP, STATUS_LABELS, type DqeLine, type DqeLineInput } from '../types';
import PageHeader from '../../../components/ui/PageHeader';
import { useAuth } from '../../../features/auth/stores/auth-store';
import { getRoleGroup } from '../../../lib/roles';

function fmtHT(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

const STATUS_BADGE: Record<string, string> = {
  draft:     'badge badge-draft',
  soumise:   'badge badge-urgent',
  validated: 'badge badge-active',
  archived:  'badge badge-archived',
};

type LineFormState = DqeLineInput & { _editing?: boolean };

const EMPTY_LINE: DqeLineInput = {
  lot: '', ouvrage: '', unite: 'm²', quantite: 0, prix_unitaire: 0,
};

export default function DqeEditorPage() {
  const { id: projectId, versionId } = useParams<{ id: string; versionId: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const roleGroup = getRoleGroup(user?.role?.name ?? '');

  const pid = Number(projectId);
  const vid = Number(versionId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dqe-version', pid, vid],
    queryFn: () => getDqeVersion(pid, vid),
    enabled: !!pid && !!vid,
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<DqeLineInput>({ ...EMPTY_LINE });
  const [editingLine, setEditingLine] = useState<(DqeLine & Partial<DqeLineInput>) | null>(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const transitionVersion = useMutation({
    mutationFn: (payload: { status: string; reason?: string }) =>
      transitionDqeVersion(pid, vid, payload as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dqe-version', pid, vid] });
      qc.invalidateQueries({ queryKey: ['portfolio-operations'] });
      setRejectModal(false);
      setRejectReason('');
    },
  });

  const dupVersion = useMutation({
    mutationFn: () => duplicateDqeVersion(pid, vid),
    onSuccess: (v) => nav(`/projects/${pid}/dqe/${v.id}`),
  });

  const addLine = useMutation({
    mutationFn: (payload: DqeLineInput) => createDqeLine(pid, vid, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dqe-version', pid, vid] });
      setShowAddForm(false);
      setAddForm({ ...EMPTY_LINE });
    },
  });

  const saveLine = useMutation({
    mutationFn: ({ lineId, payload }: { lineId: number; payload: Partial<DqeLineInput> }) =>
      updateDqeLine(pid, vid, lineId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dqe-version', pid, vid] });
      setEditingLine(null);
    },
  });

  const removeLine = useMutation({
    mutationFn: (lineId: number) => deleteDqeLine(pid, vid, lineId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dqe-version', pid, vid] }),
  });

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.lot.trim() || !addForm.ouvrage.trim()) return;
    addLine.mutate(addForm);
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLine) return;
    saveLine.mutate({
      lineId: editingLine.id,
      payload: {
        lot: editingLine.lot,
        ouvrage: editingLine.ouvrage,
        unite: editingLine.unite,
        quantite: editingLine.quantite,
        prix_unitaire: editingLine.prix_unitaire,
      },
    });
  }

  if (isLoading) return <div className="page-content"><SkeletonPage /></div>;
  if (error || !data) return <p style={{ padding: 40, color: 'var(--text-muted)', textAlign: 'center' }}>Erreur de chargement.</p>;

  const { version, lots } = data;
  const totalLines  = lots.reduce((acc, l) => acc + l.lines.length, 0);
  const canManage   = roleGroup === 'direction' || roleGroup === 'dt';
  const canSubmit   = version.status === 'draft' && !canManage;
  const canValidate = version.status === 'soumise' && canManage;
  const canValidateDirect = version.status === 'draft' && canManage;

  return (
    <div>
      <PageHeader
        breadcrumb="DQE"
        title={version.name}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="dqe-back-btn"
              onClick={() => nav(`/projects/${pid}`)}
            >
              ← Retour au chantier
            </button>
            {canSubmit && (
              <button
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: 13 }}
                onClick={() => transitionVersion.mutate({ status: 'soumise' })}
                disabled={transitionVersion.isPending || totalLines === 0}
                title={totalLines === 0 ? 'Ajoutez des lignes avant de soumettre' : ''}
              >
                ✉ Soumettre au DG
              </button>
            )}
            {(canValidate || canValidateDirect) && (
              <button
                className="btn-primary"
                style={{ background: '#16a34a', borderColor: '#16a34a', padding: '6px 14px', fontSize: 13 }}
                onClick={() => transitionVersion.mutate({ status: 'validated' })}
                disabled={transitionVersion.isPending}
              >
                ✓ Valider
              </button>
            )}
            {canValidate && (
              <button
                className="dqe-back-btn"
                style={{ color: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => setRejectModal(true)}
                disabled={transitionVersion.isPending}
                title="Renvoyer en brouillon avec motif"
              >
                ✕ Rejeter
              </button>
            )}
            <button
              className="dqe-dup-btn"
              onClick={() => dupVersion.mutate()}
              disabled={dupVersion.isPending}
              title="Dupliquer cette version DQE"
            >
              ⎘ Dupliquer
            </button>
            <button
              className="dqe-pdf-btn"
              onClick={() => downloadDqePdf(pid, vid, `dqe-v${version.version_number}.pdf`)}
            >
              ↓ PDF
            </button>
          </div>
        }
      />

      {/* Meta strip */}
      <div className="proj-kpi-row">
        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--blue">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>Version {version.version_number}</div>
            <div className="proj-kpi__label">
              <span className={STATUS_BADGE[version.status] ?? 'badge badge-draft'}>
                {STATUS_LABELS[version.status]}
              </span>
            </div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--orange">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{lots.length}</div>
            <div className="proj-kpi__label">Lots</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--teal">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 12h6M9 16h6M9 8h6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value">{totalLines}</div>
            <div className="proj-kpi__label">Lignes</div>
          </div>
        </div>

        <div className="proj-kpi">
          <div className="proj-kpi__icon proj-kpi__icon--green">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="proj-kpi__body">
            <div className="proj-kpi__value" style={{ fontSize: 15 }}>{fmtHT(version.total_ht)}</div>
            <div className="proj-kpi__label">Total HT (FCFA)</div>
          </div>
        </div>
      </div>

      {/* DQE spreadsheet */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table className="dqe-table">
          <thead>
            <tr>
              <th className="dqe-th dqe-th--ouvrage">Désignation</th>
              <th className="dqe-th dqe-th--unite">Unité</th>
              <th className="dqe-th dqe-th--qty">Quantité</th>
              <th className="dqe-th dqe-th--pu">PU HT (FCFA)</th>
              <th className="dqe-th dqe-th--total">Montant HT</th>
              <th className="dqe-th dqe-th--actions"></th>
            </tr>
          </thead>
          <tbody>
            {lots.length === 0 && (
              <tr>
                <td colSpan={6} className="dqe-empty-row">
                  Aucune ligne. Utilisez "Ajouter une ligne" ci-dessous.
                </td>
              </tr>
            )}
            {lots.map(lot => (
              <>
                <tr key={`lot-${lot.lot}`} className="dqe-lot-header">
                  <td colSpan={4} className="dqe-lot-name">{lot.lot.toUpperCase()}</td>
                  <td className="dqe-lot-subtotal">{fmtHT(lot.subtotal)}</td>
                  <td></td>
                </tr>
                {lot.lines.map(line => (
                  editingLine?.id === line.id ? (
                    <tr key={line.id} className="dqe-line dqe-line--editing">
                      <td>
                        <input
                          className="dqe-input"
                          value={editingLine.ouvrage}
                          onChange={e => setEditingLine(l => l && ({ ...l, ouvrage: e.target.value }))}
                          placeholder="Désignation"
                        />
                        <input
                          className="dqe-input dqe-input--lot"
                          value={editingLine.lot}
                          onChange={e => setEditingLine(l => l && ({ ...l, lot: e.target.value }))}
                          placeholder="Lot"
                        />
                      </td>
                      <td>
                        <select
                          className="dqe-select"
                          value={editingLine.unite}
                          onChange={e => setEditingLine(l => l && ({ ...l, unite: e.target.value }))}
                        >
                          {UNITES_BTP.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td>
                        <input
                          className="dqe-input dqe-input--num"
                          type="number"
                          min={0}
                          step="0.001"
                          value={editingLine.quantite}
                          onChange={e => setEditingLine(l => l && ({ ...l, quantite: parseFloat(e.target.value) || 0 }))}
                        />
                      </td>
                      <td>
                        <input
                          className="dqe-input dqe-input--num"
                          type="number"
                          min={0}
                          value={editingLine.prix_unitaire}
                          onChange={e => setEditingLine(l => l && ({ ...l, prix_unitaire: parseFloat(e.target.value) || 0 }))}
                        />
                      </td>
                      <td className="dqe-td--total">
                        {fmtHT((editingLine.quantite ?? 0) * (editingLine.prix_unitaire ?? 0))}
                      </td>
                      <td className="dqe-td--actions">
                        <button className="dqe-save-btn" onClick={handleEditSubmit} disabled={saveLine.isPending}>✓</button>
                        <button className="dqe-cancel-btn" onClick={() => setEditingLine(null)}>×</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={line.id} className="dqe-line">
                      <td className="dqe-td--ouvrage">{line.ouvrage}</td>
                      <td className="dqe-td--unite">{line.unite}</td>
                      <td className="dqe-td--qty">{line.quantite.toLocaleString('fr-FR', { maximumFractionDigits: 3 })}</td>
                      <td className="dqe-td--pu">{fmtHT(line.prix_unitaire)}</td>
                      <td className="dqe-td--total">{fmtHT(line.montant_ht)}</td>
                      <td className="dqe-td--actions">
                        <button className="dqe-edit-line-btn" onClick={() => setEditingLine({ ...line })}>✎</button>
                        <button
                          className="dqe-del-line-btn"
                          onClick={() => {
                            if (confirm(`Supprimer "${line.ouvrage}" ?`)) removeLine.mutate(line.id);
                          }}
                        >×</button>
                      </td>
                    </tr>
                  )
                ))}
              </>
            ))}
          </tbody>
        </table>

        {/* Add line form */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          {showAddForm ? (
            <form className="dqe-add-form" onSubmit={handleAddSubmit}>
              <div className="dqe-add-form__row">
                <input
                  className="dqe-input dqe-input--lot"
                  value={addForm.lot}
                  onChange={e => setAddForm(f => ({ ...f, lot: e.target.value }))}
                  placeholder="Lot (ex: Gros Œuvre)"
                  required
                />
                <input
                  className="dqe-input dqe-input--ouvrage"
                  value={addForm.ouvrage}
                  onChange={e => setAddForm(f => ({ ...f, ouvrage: e.target.value }))}
                  placeholder="Désignation (ex: Béton fondations)"
                  required
                />
                <select
                  className="dqe-select"
                  value={addForm.unite}
                  onChange={e => setAddForm(f => ({ ...f, unite: e.target.value }))}
                >
                  {UNITES_BTP.map(u => <option key={u}>{u}</option>)}
                </select>
                <input
                  className="dqe-input dqe-input--num"
                  type="number"
                  min={0}
                  step="0.001"
                  value={addForm.quantite || ''}
                  onChange={e => setAddForm(f => ({ ...f, quantite: parseFloat(e.target.value) || 0 }))}
                  placeholder="Qté"
                />
                <input
                  className="dqe-input dqe-input--num"
                  type="number"
                  min={0}
                  value={addForm.prix_unitaire || ''}
                  onChange={e => setAddForm(f => ({ ...f, prix_unitaire: parseFloat(e.target.value) || 0 }))}
                  placeholder="PU HT"
                />
                <span className="dqe-add-form__preview">
                  = {fmtHT(addForm.quantite * addForm.prix_unitaire)} FCFA
                </span>
              </div>
              <div className="dqe-add-form__btns">
                <button type="submit" className="btn-primary" style={{ padding: '6px 16px', fontSize: 13 }} disabled={addLine.isPending}>
                  {addLine.isPending ? '…' : 'Ajouter'}
                </button>
                <button type="button" className="dqe-new-cancel" onClick={() => setShowAddForm(false)}>
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <button className="dqe-add-line-btn" onClick={() => setShowAddForm(true)}>
              + Ajouter une ligne
            </button>
          )}
        </div>

        {/* Grand total */}
        <div className="dqe-grand-total">
          <span className="dqe-grand-total__label">TOTAL GÉNÉRAL HT</span>
          <span className="dqe-grand-total__value">{fmtHT(version.total_ht)} FCFA</span>
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="mr-overlay" onClick={() => setRejectModal(false)}>
          <div className="mr-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <h2 className="mr-modal__title">Motif de rejet</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Ce motif sera transmis à l'auteur du DQE.
            </p>
            <textarea
              className="form-textarea"
              rows={4}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Expliquer les corrections attendues…"
              style={{ width: '100%', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn--secondary" onClick={() => setRejectModal(false)}>Annuler</button>
              <button
                className="btn"
                style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
                disabled={!rejectReason.trim() || transitionVersion.isPending}
                onClick={() => transitionVersion.mutate({ status: 'draft', reason: rejectReason })}
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
