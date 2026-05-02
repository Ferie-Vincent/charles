import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDqeVersion,
  createDqeLine,
  updateDqeLine,
  deleteDqeLine,
  updateDqeVersion,
  downloadDqePdf,
  duplicateDqeVersion,
} from '../api/dqe-api';
import { UNITES_BTP, STATUS_LABELS, type DqeLine, type DqeLineInput } from '../types';

function fmtHT(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

const STATUS_COLORS: Record<string, string> = {
  draft:     '#64748b',
  validated: '#16a34a',
  archived:  '#d97706',
};

type LineFormState = DqeLineInput & { _editing?: boolean };

const EMPTY_LINE: DqeLineInput = {
  lot: '', ouvrage: '', unite: 'm²', quantite: 0, prix_unitaire: 0,
};

export default function DqeEditorPage() {
  const { id: projectId, versionId } = useParams<{ id: string; versionId: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();

  const pid = Number(projectId);
  const vid = Number(versionId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dqe-version', pid, vid],
    queryFn: () => getDqeVersion(pid, vid),
    enabled: !!pid && !!vid,
  });

  // New line form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<DqeLineInput>({ ...EMPTY_LINE });
  const [editingLine, setEditingLine] = useState<(DqeLine & Partial<DqeLineInput>) | null>(null);

  const updateVersion = useMutation({
    mutationFn: (status: string) => updateDqeVersion(pid, vid, { status: status as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dqe-version', pid, vid] }),
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

  if (isLoading) return <div className="dqe-editor__loading">Chargement…</div>;
  if (error || !data) return <div className="dqe-editor__loading">Erreur de chargement.</div>;

  const { version, lots } = data;
  const statusColor = STATUS_COLORS[version.status] ?? '#64748b';

  return (
    <div className="dqe-editor">
      {/* Header */}
      <div className="dqe-editor__header">
        <div className="dqe-editor__nav">
          <button className="dqe-back-btn" onClick={() => nav(`/projects/${pid}`)}>
            ← Retour au chantier
          </button>
        </div>
        <div className="dqe-editor__title-row">
          <div>
            <h1 className="dqe-editor__title">{version.name}</h1>
            <p className="dqe-editor__sub">
              Version {version.version_number} &nbsp;·&nbsp;
              <span style={{ color: statusColor, fontWeight: 600 }}>
                {STATUS_LABELS[version.status]}
              </span>
              &nbsp;·&nbsp; {lots.reduce((acc, l) => acc + l.lines.length, 0)} lignes
            </p>
          </div>
          <div className="dqe-editor__actions">
            <div className="dqe-editor__total">
              <span className="dqe-editor__total-label">Total HT</span>
              <span className="dqe-editor__total-value">{fmtHT(version.total_ht)} FCFA</span>
            </div>
            {version.status === 'draft' && (
              <button
                className="dqe-validate-btn"
                onClick={() => updateVersion.mutate('validated')}
                disabled={updateVersion.isPending}
              >
                ✓ Valider
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
              onClick={() => downloadDqePdf(
                pid, vid,
                `dqe-v${version.version_number}.pdf`,
              )}
            >
              ↓ PDF
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="dqe-editor__body">
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
                        <button
                          className="dqe-edit-line-btn"
                          onClick={() => setEditingLine({ ...line })}
                        >✎</button>
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
              <button type="submit" className="dqe-new-submit" disabled={addLine.isPending}>
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

        {/* Grand total */}
        <div className="dqe-grand-total">
          <span className="dqe-grand-total__label">TOTAL GÉNÉRAL HT</span>
          <span className="dqe-grand-total__value">{fmtHT(version.total_ht)} FCFA</span>
        </div>
      </div>
    </div>
  );
}
