import { api } from '../../../lib/api';

export type ActionItem = { task: string; owner: string; due_date?: string };

export type MeetingInput = {
  date: string;
  location?: string;
  participants: string[];
  agenda_items: string[];
  decisions?: string[];
  action_items?: ActionItem[];
};

export async function generateMeetingReport(projectId: number, input: MeetingInput): Promise<string> {
  const res = await api.post(`/projects/${projectId}/meeting-report`, input);
  if (res.data.error) throw new Error(res.data.error);
  return res.data.report as string;
}
