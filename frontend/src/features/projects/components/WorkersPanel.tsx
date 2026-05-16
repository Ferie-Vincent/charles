import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkers, createWorker, updateWorker, deleteWorker, upsertAttendance,
  TRADES, type Worker,
} from '../api/workers';

interface Props {
  projectId: number;
  date: string; // YYYY-MM-DD
  readonly?: boolean;
}

const TASK_SUGGESTIONS = [
  'Coulage dalle', 'Ferraillage', 'Coffrage', 'Maçonnerie', 'Enduit',
  'Carrelage', 'Peinture', 'Plomberie', 'Électricité', 'Terrassement',
  'Charpente', 'Toiture', 'Nettoyage chantier',
];

export default function WorkersPanel({ projectId, date, readonly = false }: Props) {
  const qc = useQueryClient();
  const qKey = ['workers', projectId, date];

  const { data: workers = [], isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => fetchWorkers(projectId, date),
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: qKey });

  const addMutation = useMutation({
    mutationFn: (d: { name: string; trade: string; phone?: string }) =>
      createWorker(projectId, d),
    onSuccess: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: (d: { worker_id: number; present: boolean; task_assigned?: string | null }) =>
      upsertAttendance(projectId, { ...d, log_date: date }),
    onSuccess: invalidate,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => updateWorker(projectId, id, { is_active: false }),
    onSuccess: invalidate,
  });

  const [showAdd, setShowAdd]         = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [taskEditing, setTaskEditing] = useState<number | null>(null);
  const [taskValue, setTaskValue]     = useState('');

  const active   = workers.filter(w => w.is_active);
  const inactive = workers.filter(w => !w.is_active);
  const present  = active.filter(w => w.attendance?.present).length;

  function handleToggle(w: Worker) {
    if (readonly) return;
    const nowPresent = !(w.attendance?.present ?? false);
    toggleMutation.mutate({
      worker_id: w.id,
      present: nowPresent,
      task_assigned: w.attendance?.task_assigned ?? null,
    });
  }

  function openTaskEdit(w: Worker) {
    setTaskEditing(w.id);
    setTaskValue(w.attendance?.task_assigned ?? '');
  }

  function saveTask(w: Worker) {
    toggleMutation.mutate({
      worker_id: w.id,
      present: w.attendance?.present ?? true,
      task_assigned: taskValue.trim() || null,
    });
    setTaskEditing(null);
  }

  return (
    <div className="workers-panel">
      {/* KPI bar */}
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

      {/* Add form */}
      {showAdd && !readonly && (
        <AddWorkerForm
          onSave={(d) => { addMutation.mutate(d); setShowAdd(false); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Worker list */}
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
              taskEditing={taskEditing === w.id}
              taskValue={taskValue}
              onToggle={() => handleToggle(w)}
              onOpenTask={() => openTaskEdit(w)}
              onTaskChange={setTaskValue}
              onTaskSave={() => saveTask(w)}
              onTaskCancel={() => setTaskEditing(null)}
              onDeactivate={() => deactivateMutation.mutate(w.id)}
            />
          ))}
        </ul>
      )}

      {/* Inactive workers toggle */}
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
                      onClick={() => updateWorker(projectId, w.id, { is_active: true }).then(invalidate)}
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

// ── WorkerRow ────────────────────────────────────────────────────────────────

interface RowProps {
  worker: Worker;
  readonly: boolean;
  taskEditing: boolean;
  taskValue: string;
  onToggle: () => void;
  onOpenTask: () => void;
  onTaskChange: (v: string) => void;
  onTaskSave: () => void;
  onTaskCancel: () => void;
  onDeactivate: () => void;
}

function WorkerRow({
  worker: w, readonly, taskEditing, taskValue,
  onToggle, onOpenTask, onTaskChange, onTaskSave, onTaskCancel, onDeactivate,
}: RowProps) {
  const present = w.attendance?.present ?? false;
  const task    = w.attendance?.task_assigned;

  return (
    <li className={`workers-panel__row${present ? ' workers-panel__row--present' : ''}`}>
      {/* Presence toggle */}
      {readonly ? (
        <span className={`workers-panel__badge${present ? ' workers-panel__badge--present' : ' workers-panel__badge--absent'}`}>
          {present ? '✓' : '✗'}
        </span>
      ) : (
        <button
          type="button"
          className={`workers-panel__toggle${present ? ' workers-panel__toggle--present' : ''}`}
          onClick={onToggle}
          aria-label={present ? 'Marquer absent' : 'Marquer présent'}
        >
          {present ? '✓' : '○'}
        </button>
      )}

      {/* Identity */}
      <div className="workers-panel__info">
        <span className="workers-panel__name">{w.name}</span>
        <span className="workers-panel__trade">{w.trade}</span>
      </div>

      {/* Task */}
      <div className="workers-panel__task-area">
        {taskEditing ? (
          <div className="workers-panel__task-edit">
            <input
              className="workers-panel__task-input"
              value={taskValue}
              onChange={e => onTaskChange(e.target.value)}
              list={`task-suggestions-${w.id}`}
              placeholder="Tâche affectée…"
              autoFocus
            />
            <datalist id={`task-suggestions-${w.id}`}>
              {TASK_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
            <div className="workers-panel__task-actions">
              <button type="button" className="workers-panel__task-save" onClick={onTaskSave}>✓</button>
              <button type="button" className="workers-panel__task-cancel" onClick={onTaskCancel}>✗</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={`workers-panel__task-btn${task ? ' workers-panel__task-btn--filled' : ''}`}
            onClick={onOpenTask}
            disabled={readonly}
          >
            {task ?? (readonly ? '—' : 'Affecter tâche')}
          </button>
        )}
      </div>

      {/* Deactivate */}
      {!readonly && (
        <button
          type="button"
          className="workers-panel__deactivate"
          onClick={onDeactivate}
          title="Retirer du chantier"
        >
          ×
        </button>
      )}
    </li>
  );
}

// ── AddWorkerForm ────────────────────────────────────────────────────────────

interface AddFormProps {
  onSave: (d: { name: string; trade: string; phone?: string }) => void;
  onCancel: () => void;
}

function AddWorkerForm({ onSave, onCancel }: AddFormProps) {
  const [name, setName]         = useState('');
  const [trade, setTrade]       = useState('');
  const [customTrade, setCustomTrade] = useState('');
  const [phone, setPhone]       = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const finalTrade = trade === 'Autre' ? customTrade.trim() : trade;
    if (!name.trim() || !finalTrade) return;
    onSave({ name: name.trim(), trade: finalTrade, phone: phone.trim() || undefined });
  }

  return (
    <form className="workers-panel__add-form" onSubmit={submit}>
      <div className="workers-panel__add-row">
        <input
          className="workers-panel__input"
          placeholder="Nom complet *"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <select
          className="workers-panel__select"
          value={trade}
          onChange={e => setTrade(e.target.value)}
          required
        >
          <option value="">Corps de métier *</option>
          {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {trade === 'Autre' && (
        <input
          className="workers-panel__input"
          placeholder="Précisez le corps de métier *"
          value={customTrade}
          onChange={e => setCustomTrade(e.target.value)}
          required
        />
      )}
      <div className="workers-panel__add-row">
        <input
          className="workers-panel__input"
          placeholder="Téléphone (optionnel)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          type="tel"
        />
        <div className="workers-panel__add-btns">
          <button type="submit" className="btn btn--primary btn--sm">Ajouter</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>Annuler</button>
        </div>
      </div>
    </form>
  );
}
