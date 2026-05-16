import { useState } from 'react';
import type { Worker } from '../../api/workers';

const TASK_SUGGESTIONS = [
  'Coulage dalle', 'Ferraillage', 'Coffrage', 'Maçonnerie', 'Enduit',
  'Carrelage', 'Peinture', 'Plomberie', 'Électricité', 'Terrassement',
  'Charpente', 'Toiture', 'Nettoyage chantier',
];

interface Props {
  worker: Worker;
  readonly: boolean;
  onToggle: () => void;
  onTaskSave: (task: string | null) => void;
  onDeactivate: () => void;
}

export default function WorkerRow({ worker: w, readonly, onToggle, onTaskSave, onDeactivate }: Props) {
  const present = w.attendance?.present ?? false;
  const task    = w.attendance?.task_assigned;

  const [taskEditing, setTaskEditing] = useState(false);
  const [taskValue, setTaskValue]     = useState('');

  function openTaskEdit() {
    setTaskEditing(true);
    setTaskValue(w.attendance?.task_assigned ?? '');
  }

  function saveTask() {
    onTaskSave(taskValue.trim() || null);
    setTaskEditing(false);
  }

  return (
    <li className={`workers-panel__row${present ? ' workers-panel__row--present' : ''}`}>
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

      <div className="workers-panel__info">
        <span className="workers-panel__name">{w.name}</span>
        <span className="workers-panel__trade">{w.trade}</span>
      </div>

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
