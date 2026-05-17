import { api } from '../../../lib/api';

export type ProjectMember = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string | null;
};

export type CreateMeetingPayload = {
  project_code: string;
  title: string;
  scheduled_at: string;
  location?: string;
  notes?: string;
  invitee_ids: number[];
  alert_key?: string;
  alert_type?: string;
  alert_detail?: string;
};

export type UserNotification = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

export type RsvpStatus = {
  accepted: number;
  declined: number;
  invited: number;
  invitees: { id: number; name: string; status: string }[];
};

export async function getProjectMembers(projectId: number): Promise<ProjectMember[]> {
  const res = await api.get(`/projects/${projectId}/members`);
  return res.data;
}

export async function createMeeting(payload: CreateMeetingPayload) {
  const res = await api.post('/meetings', payload);
  return res.data;
}

export async function respondToMeeting(meetingId: number, status: 'accepted' | 'declined' | 'invited') {
  const res = await api.patch(`/meeting-invitations/${meetingId}/respond`, { status });
  return res.data;
}

export async function getMeetingRsvpStatus(meetingId: number): Promise<RsvpStatus> {
  const res = await api.get(`/meetings/${meetingId}/rsvp-status`);
  return res.data;
}

export async function getUserNotifications(): Promise<{ notifications: UserNotification[]; unread: number }> {
  const res = await api.get('/notifications');
  return res.data;
}

export async function markNotificationRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await api.post('/notifications/read-all');
}

export async function dismissAlert(alertKey: string, durationHours: 0 | 24 | 72 | 168 = 24) {
  const res = await api.post('/dashboard/alerts/dismiss', {
    alert_key: alertKey,
    duration_hours: durationHours,
  });
  return res.data;
}

/** Prochain jour ouvrable à 09:00 heure locale */
export function suggestMeetingDateTime(): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);
  const daysToAdd = now.getHours() >= 15 ? 2 : 1;
  next.setDate(next.getDate() + daysToAdd);
  if (next.getDay() === 6) next.setDate(next.getDate() + 2);
  if (next.getDay() === 0) next.setDate(next.getDate() + 1);
  return next.toISOString().slice(0, 16);
}
