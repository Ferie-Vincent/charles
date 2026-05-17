import { useState } from 'react';
import type { Worker } from '../../api/workers';
import { STATUT_OPTIONS, type AttendanceStatut } from '../../api/workers';

const TASK_SUGGESTIONS = [
  'Coulage dalle', 'Ferraillage', 'Coffrage', 'Maçonnerie', 'Enduit',
  'Carrelage', 'Peinture', 'Plomberie', 'Électricité', 'Terrassement',
  'Charpente', 'Toiture', 'Nettoyage chantier',
];

interface Props {
  worker: Worker;
  readonly: boolean;
  onAttendance: (statut: AttendanceStatut, heures_normales: number, heures_sup: number) => void;
  onTaskSave: (task: string | null) => void;
  onDeactivate: () => void;
}

export default function WorkerRow({ worker: w, readonly, onAttendance, onTaskSave, onDeactivate }: Props) {
  const statut       = w.attendance?.statut ?? 'absent';
  const heuresNorm   = w.attendance?.heures_normales ?? 8;
  const heuresSup    = w.attendance?.heures_sup ?? 0;
  const task         = w.attendance?.task_assigned;

  const [taskEditing, setTaskEditing] = useState(false);
  const [taskValue, setTaskValue]     = useState('');

  const statutMeta = STATUT_OPTIONS.find(o => o.value === statut) ?? STATUT_OPTIONS[1];
  const isWorking  = statut === 'present' || statut === 'demi_journee';

  function handleStatutChange(val: AttendanceStatut) {
    const defaultHours = val === 'demi_journee' ? 4 : 8;
    const normH        = val === 'absent' || val === 'conge' || val === 'maladie' ? 0 : defaultHours;
    onAttendance(val, normH, 0);
  }

  function handleHeuresChange(normales: number, sup: number) {
    onAttendance(statut, normales, sup);
  }

  function openTaskEdit() {
    setTaskEditing(true);
    setTaskValue(w.attendance?.task_assigned ?? '');
  }

  function saveTask() {
    onTaskSave(taskValue.trim() || null);
    setTaskEditing(false);
  }

  return (
    <li className={`workers-panel__row${isWorking ? ' workers-panel__row--present' : ''}`}>
      <div className="workers-panel__info">
        <span className="workers-panel__name">{w.name}</span>
        <span className="workers-panel__trade">{w.trade}</span>
      </div>

      {readonly ? (
        <span
          className="workers-panel__statut-badge"
          style={{ color: statutMeta.color }}
        >
          {statutMeta.label}
        </span>
      ) : (
        <select
          className="workers-panel__statut-select"
          value={statut}
          onChange={e => handleStatutChange(e.target.value as AttendanceStatut)}
          style={{ borderColor: statutMeta.color }}
        >
          {STATUT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {isWorking && !readonly && (
        <div className="workers-panel__heures">
          <label className="workers-panel__heures-label">
            H
            <input
              type="number"
              className="workers-panel__heures-input"
              min={0}
              max={12}
              step={0.5}
              value={heuresNorm}
              onChange={e => handleHeuresChange(parseFloat(e.target.value) || 0, heuresSup)}
            />
          </label>
          <label className="workers-panel__heures-label">
            HS
            <input
              type="number"
              className="workers-panel__heures-input"
              min={0}
              max={8}
              step={0.5}
              value={heuresSup}
              onChange={e => handleHeuresChange(heuresNorm, parseFloat(e.target.value) || 0)}
            />
          </label>
        </div>
      )}

      <div className="workers-panel__task-area">
        {taskEditing ? (
          <div className="workers-panel__task-edit">
            <input
              className="workers-panel__task-input"
              value={taskValue}
              onChange={e => setTaskValue(e.target.value)}
              list={`task-suggestions-${w.id}`}
              placeholder="Tâche affectée…"
              autoFocus
            />
            <datalist id={`task-suggestions-${w.id}`}>
              {TASK_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
            <div className="workers-panel__task-actions">
              <button type="button" className="workers-panel__task-save" onClick={saveTask}>✓</button>
              <button type="button" className="workers-panel__task-cancel" onClick={() => setTaskEditing(false)}>✗</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={`workers-panel__task-btn${task ? ' workers-panel__task-btn--filled' : ''}`}
            onClick={openTaskEdit}
            disabled={readonly}
          >
            {task ?? (readonly ? '—' : 'Affecter tâche')}
          </button>
        )}
      </div>

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
