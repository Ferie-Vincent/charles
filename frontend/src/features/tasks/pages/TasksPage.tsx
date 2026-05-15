import { useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor,
  useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, updateTask, deleteTask } from '../api/tasks-api';
import type { Task, TaskStatus } from '../api/tasks-api';
import PageHeader from '../../../components/ui/PageHeader';
import SkeletonPage from '../../../components/ui/SkeletonPage';

const COLUMNS: {
  status: TaskStatus;
  label: string;
  accent: string;
  bg: string;
  icon: string;
}[] = [
  { status: 'todo',        label: 'À faire',    accent: '#6366f1', bg: '#eef2ff', icon: '📋' },
  { status: 'in_progress', label: 'En cours',   accent: '#f59e0b', bg: '#fffbeb', icon: '⚡' },
  { status: 'blocked',     label: 'Bloqué',     accent: '#ef4444', bg: '#fef2f2', icon: '🚫' },
  { status: 'done',        label: 'Terminé',    accent: '#10b981', bg: '#ecfdf5', icon: '🎉' },
  { status: 'cancelled',   label: 'Annulé',     accent: '#94a3b8', bg: '#f8fafc', icon: '✕'  },
];

const PRIORITY_CONFIG: Record<Task['priority'], { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent',  color: '#991b1b', bg: '#fee2e2' },
  high:   { label: 'Haute',   color: '#92400e', bg: '#fef3c7' },
  normal: { label: 'Normal',  color: '#166534', bg: '#dcfce7' },
};

const SOURCE_CONFIG: Record<Task['source'], { label: string; color: string }> = {
  ai:     { label: '⚡ Alerte auto', color: '#7c3aed' },
  manual: { label: '✏️ Manuel',      color: '#64748b' },
};

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Card content ──────────────────────────────────────────────────────────────
function TaskCardContent({
  task,
  colAccent,
  isDragging = false,
  onDelete,
}: {
  task: Task;
  colAccent: string;
  isDragging?: boolean;
  onDelete?: (id: number) => void;
}) {
  const prio = PRIORITY_CONFIG[task.priority];
  const src  = SOURCE_CONFIG[task.source];
  const isCancelled = task.status === 'cancelled';

  return (
    <div
      className={`kb-card kb-card--${task.priority}${isDragging ? ' kb-card--dragging' : ''}${isCancelled ? ' kb-card--cancelled' : ''}`}
      style={{ '--col-accent': colAccent } as React.CSSProperties}
    >
      {/* Priority stripe */}
      <div className="kb-card__stripe" style={{ background: prio.color }} />

      <div className="kb-card__body">
        {/* Top row */}
        <div className="kb-card__top">
          <span className="kb-card__source" style={{ color: src.color }}>{src.label}</span>
          <span className="kb-card__prio" style={{ color: prio.color, background: prio.bg }}>
            {prio.label}
          </span>
        </div>

        {/* Title */}
        <p className="kb-card__title">{task.title}</p>
        {task.detail && <p className="kb-card__detail">{task.detail}</p>}

        {/* Tags */}
        {(task.project_code || task.role_target) && (
          <div className="kb-card__tags">
            {task.project_code && (
              <span className="kb-tag kb-tag--project">{task.project_code}</span>
            )}
            {task.role_target && (
              <span className="kb-tag kb-tag--role">{task.role_target}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="kb-card__footer">
          <div className="kb-card__avatars">
            <div className="kb-avatar" title={`Créé par ${task.creator.name}`} style={{ background: '#6366f1' }}>
              {initials(task.creator.name)}
            </div>
            {task.assignee && (
              <div className="kb-avatar" title={`Assigné à ${task.assignee.name}`} style={{ background: '#10b981', marginLeft: -8 }}>
                {initials(task.assignee.name)}
              </div>
            )}
          </div>
          <span className="kb-card__date">{fmtDate(task.created_at)}</span>
        </div>

        {!isDragging && onDelete && (
          <button
            type="button"
            className="kb-card__del"
            onClick={e => { e.stopPropagation(); onDelete(task.id); }}
            title="Supprimer"
          >×</button>
        )}
      </div>
    </div>
  );
}

// ── Draggable wrapper ─────────────────────────────────────────────────────────
function DraggableCard({
  task,
  colAccent,
  onDelete,
}: {
  task: Task;
  colAccent: string;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      className={`kb-drag-handle${isDragging ? ' kb-drag-handle--source' : ''}`}
      {...listeners}
      {...attributes}
    >
      <TaskCardContent task={task} colAccent={colAccent} onDelete={onDelete} />
    </div>
  );
}

// ── Droppable column ──────────────────────────────────────────────────────────
function DroppableColumn({
  col,
  tasks,
  onDelete,
}: {
  col: typeof COLUMNS[number];
  tasks: Task[];
  onDelete: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });

  return (
    <div className="kb-col">
      <div className="kb-col__header" style={{ background: col.bg, borderTopColor: col.accent }}>
        <span className="kb-col__icon">{col.icon}</span>
        <span className="kb-col__label">{col.label}</span>
        <span className="kb-col__badge" style={{ background: col.accent }}>
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`kb-col__body${isOver ? ' kb-col__body--over' : ''}`}
        style={isOver ? { borderColor: col.accent, background: col.bg } : undefined}
      >
        {tasks.length === 0 && (
          <div className={`kb-col__empty${isOver ? ' kb-col__empty--over' : ''}`}>
            <span>{isOver ? '⬇ Déposer ici' : 'Vide'}</span>
          </div>
        )}
        {tasks.map(task => (
          <DraggableCard
            key={task.id}
            task={task}
            colAccent={col.accent}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeAccent, setActiveAccent] = useState('#6366f1');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
    staleTime: 30_000,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      updateTask(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const prev = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === id ? { ...t, status } : t) ?? []
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks'], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const prev = queryClient.getQueryData<Task[]>(['tasks']);
      queryClient.setQueryData<Task[]>(['tasks'], old => old?.filter(t => t.id !== id) ?? []);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['tasks'], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  if (isLoading) return <div className="page-content"><SkeletonPage rows={3} /></div>;

  const byStatus = (s: TaskStatus) => tasks.filter(t => t.status === s);
  const openCount = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length;

  const handleDragStart = (e: DragStartEvent) => {
    const task = tasks.find(t => t.id === e.active.id);
    if (task) {
      setActiveTask(task);
      setActiveAccent(COLUMNS.find(c => c.status === task.status)?.accent ?? '#6366f1');
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);
    if (!over) return;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find(t => t.id === active.id);
    if (task && task.status !== newStatus) {
      moveMutation.mutate({ id: Number(active.id), status: newStatus });
    }
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Tâches"
        subtitle={`${openCount} en cours · ${tasks.filter(t => t.status === 'done').length} terminées`}
      />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="kb-board">
          {COLUMNS.map(col => (
            <DroppableColumn
              key={col.status}
              col={col}
              tasks={byStatus(col.status)}
              onDelete={id => deleteMutation.mutate(id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask && (
            <div style={{ transform: 'rotate(2.5deg) scale(1.04)', filter: 'drop-shadow(0 16px 32px rgba(0,0,0,0.22))' }}>
              <TaskCardContent task={activeTask} colAccent={activeAccent} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
