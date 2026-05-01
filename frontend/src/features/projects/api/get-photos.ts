import { api } from '../../../lib/api';

export type ProjectPhoto = {
  id: number;
  url: string;
  caption: string | null;
  tag: string | null;
  taken_at: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export async function getPhotos(projectId: number): Promise<ProjectPhoto[]> {
  const res = await api.get(`/projects/${projectId}/photos`);
  return res.data.data;
}

export async function uploadPhoto(
  projectId: number,
  file: File,
  meta: { caption?: string; tag?: string; taken_at?: string }
): Promise<ProjectPhoto> {
  const form = new FormData();
  form.append('photo', file);
  if (meta.caption) form.append('caption', meta.caption);
  if (meta.tag)     form.append('tag', meta.tag);
  if (meta.taken_at) form.append('taken_at', meta.taken_at);
  const res = await api.post(`/projects/${projectId}/photos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deletePhoto(projectId: number, photoId: number): Promise<void> {
  await api.delete(`/projects/${projectId}/photos/${photoId}`);
}
