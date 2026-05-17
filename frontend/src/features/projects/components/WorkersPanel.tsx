import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkers, createWorker, updateWorker, upsertAttendance,
  type Worker, type AttendanceStatut,
} from '../api/workers';
import AddWorkerForm from './workers/AddWorkerForm';
import WorkerRow from './workers/WorkerRow';

interface Props {
  projectId: number;
  date: string; // YYYY-MM-DD
  readonly?: boolean;
}

export default function WorkersPanel({ projectId, date, readonly = false }: Props) {
  const qc = useQueryClient();
  const qKey = ['workers', projectId, date];

  const { data: workers = [], isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => fetchWorkers(projectId, date),
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['workers', projectId] });

  const addMutation = useMutation({
    mutationFn: (d: { name: string; trade: string; phone?: string }) =>
      createWorker(projectId, d),
    onSuccess: invalidate,
  });

  const attendanceMutation = useMutation({
    mutationFn: (d: {
      worker_id: number;
      statut: AttendanceStatut;
      heures_normales: number;
      heures_sup: number;
      task_assigned?: string | null;
    }) => upsertAttendance(projectId, { ...d, log_date: date }),
    onSuccess: invalidate,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => updateWorker(projectId, id, { is_active: false }),
    onSuccess: invalidate,
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: number) => updateWorker(projectId, id, { is_active: true }),
    onSuccess: invalidate,
  });

  const [showAdd, setShowAdd]           = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const active   = workers.filter(w => w.is_active);
  const inactive = workers.filter(w => !w.is_active);
  const present  = active.filter(w => {
    const s = w.attendance?.statut;
    return s === 'present' || s === 'demi_journee';
  }).length;

  function handleAttendance(w: Worker, statut: AttendanceStatut, heures_normales: number, heures_sup: number) {
    attendanceMutation.mutate({
      worker_id:      w.id,
      statut,
      heures_normales,
      heures_sup,
      task_assigned:  w.attendance?.task_assigned ?? null,
    });
  }

  function handleTaskSave(w: Worker, task: string | null) {
    attendanceMutation.mutate({
      worker_id:      w.id,
      statut:         w.attendance?.statut ?? 'present',
      heures_normales: w.attendance?.heures_normales ?? 8,
      heures_sup:     w.attendance?.heures_sup ?? 0,
      task_assigned:  task,
    });
  }

  return (
    <div className="workers-panel">
      <div className="workers-panel__kpi">
        <span className="workers-panel__kpi-count">
          <strong>{present}</strong>/{active.length}
        </span>
        <span className="workers-panel__kpi-label">présents aujourd'hui</span>
        {!readonly && (
          <button
            className="workers-panel__add-btn"
            onClick={() => setShowAdd(s => !s)}
            type="button"
          >
            + Ajouter ouvrier
          </button>
        )}
      </div>

      {showAdd && !readonly && (
        <AddWorkerForm
          onSave={(d) => { addMutation.mutate(d); setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {isLoading ? (
        <p className="workers-panel__loading">Chargement…</p>
      ) : active.length === 0 ? (
        <p className="workers-panel__empty">
          Aucun ouvrier enregistré.{!readonly && ' Ajoutez votre équipe via "+ Ajouter ouvrier".'}
        </p>
      ) : (
        <ul className="workers-panel__list">
          {active.map(w => (
            <WorkerRow
              key={w.id}
              worker={w}
              readonly={readonly}
              onAttendance={(statut, h, hs) => handleAttendance(w, statut, h, hs)}
              onTaskSave={(task) => handleTaskSave(w, task)}
              onDeactivate={() => deactivateMutation.mutate(w.id)}
            />
          ))}
        </ul>
      )}

      {inactive.length > 0 && (
        <div className="workers-panel__inactive">
          <button
            type="button"
            className="workers-panel__inactive-toggle"
            onClick={() => setShowInactive(s => !s)}
          >
            {showInactive ? '▲' : '▼'} {inactive.length} ouvrier{inactive.length > 1 ? 's' : ''} inactif{inactive.length > 1 ? 's' : ''}
          </button>
          {showInactive && (
            <ul className="workers-panel__list workers-panel__list--inactive">
              {inactive.map(w => (
                <li key={w.id} className="workers-panel__row workers-panel__row--inactive">
                  <span className="workers-panel__name">{w.name}</span>
                  <span className="workers-panel__trade">{w.trade}</span>
                  {!readonly && (
                    <button
                      type="button"
                      className="workers-panel__reactivate"
                      onClick={() => reactivateMutation.mutate(w.id)}
                    >
                      Réactiver
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
