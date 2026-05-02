import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDqeVersions, createDqeVersion, deleteDqeVersion, duplicateDqeVersion } from '../api/dqe-api';
import { STATUS_LABELS, type DqeVersion } from '../types';

function fmtHT(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA';
}

type Props = { projectId: number };

export default function DqePanel({ projectId }: Props) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['dqe-versions', projectId],
    queryFn: () => getDqeVersions(projectId),
  });

  function invalidateDqe() {
    qc.invalidateQueries({ queryKey: ['dqe-versions', projectId] });
    qc.invalidateQueries({ queryKey: ['portfolio-dqe'] });
  }

  const create = useMutation({
    mutationFn: (name: string) => createDqeVersion(projectId, { name }),
    onSuccess: (v) => {
      invalidateDqe();
      setShowNew(false);
      setNewName('');
      nav(`/projects/${projectId}/dqe/${v.id}`);
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteDqeVersion(projectId, id),
    onSuccess: invalidateDqe,
  });

  const duplicate = useMutation({
    mutationFn: (id: number) => duplicateDqeVersion(projectId, id),
    onSuccess: (v) => {
      invalidateDqe();
      nav(`/projects/${projectId}/dqe/${v.id}`);
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (newName.trim()) create.mutate(newName.trim());
  }

  return (
    <div className="dqe-panel">
      <div className="dqe-panel__header">
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>DQE — Devis Quantitatif Estimatif</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="dqe-new-btn" onClick={() => setShowNew(v => !v)}>
          + Nouveau DQE
        </button>
      </div>

      {showNew && (
        <form className="dqe-new-form" onSubmit={handleCreate}>
          <input
            className="dqe-new-input"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nom de la version (ex: DQE Initial)"
            autoFocus
          />
          <button type="submit" className="dqe-new-submit" disabled={!newName.trim() || create.isPending}>
            {create.isPending ? '…' : 'Créer'}
          </button>
          <button type="button" className="dqe-new-cancel" onClick={() => setShowNew(false)}>
            Annuler
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="dqe-empty">Chargement…</p>
      ) : versions.length === 0 ? (
        <p className="dqe-empty">Aucune version DQE. Créez la première ci-dessus.</p>
      ) : (
        <div className="dqe-list">
          {versions.map((v: DqeVersion) => (
            <div key={v.id} className="dqe-row">
              <div className="dqe-row__left">
                <span className="dqe-row__ver">v{v.version_number}</span>
                <div>
                  <div className="dqe-row__name">{v.name}</div>
                  <div className="dqe-row__meta">
                    <span className={`dqe-status dqe-status--${v.status}`}>
                      {STATUS_LABELS[v.status]}
                    </span>
                    <span className="dqe-row__lines">{v.lines_count ?? 0} ligne{(v.lines_count ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              <div className="dqe-row__right">
                <span className="dqe-row__total">{fmtHT(v.total_ht)}</span>
                <button
                  className="dqe-row__edit"
                  onClick={() => nav(`/projects/${projectId}/dqe/${v.id}`)}
                >
                  Ouvrir
                </button>
                <button
                  className="dqe-row__dup"
                  title="Dupliquer cette version"
                  onClick={() => duplicate.mutate(v.id)}
                  disabled={duplicate.isPending}
                >
                  ⎘
                </button>
                <button
                  className="dqe-row__delete"
                  onClick={() => {
                    if (confirm(`Supprimer "${v.name}" ?`)) remove.mutate(v.id);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
