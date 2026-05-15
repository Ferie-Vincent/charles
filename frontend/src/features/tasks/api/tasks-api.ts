import { api } from '../../../lib/api';

export type TaskStatus   = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'normal';

export type Task = {
  id: number;
  title: string;
  detail: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  role_target: string | null;
  project_code: string | null;
  source: 'ai' | 'manual';
  due_date: string | null;
  assigned_to: number | null;
  assigned_by: number;
  created_at: string;
  assignee: { id: number; name: string } | null;
  creator: { id: number; name: string };
};

export type CreateTaskPayload = {
  title: string;
  detail?: string;
  priority: TaskPriority;
  role_target?: string;
  project_code?: string;
  assigned_to?: number;
  source?: 'ai' | 'manual';
  due_date?: string;
};

export async function getTasks(): Promise<Task[]> {
  const res = await api.get('/tasks');
  return res.data;
}

export async function createTasks(tasks: CreateTaskPayload[]): Promise<Task[]> {
  const res = await api.post('/tasks', { tasks });
  return res.data;
}

export async function updateTask(
  id: number,
  data: Partial<Pick<Task, 'status' | 'assigned_to' | 'due_date'>>
): Promise<Task> {
  const res = await api.patch(`/tasks/${id}`, data);
  return res.data;
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
