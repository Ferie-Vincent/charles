import { api } from './api';

export async function downloadReport(
  projectId: number,
  reportId: number,
  filename: string,
): Promise<void> {
  const response = await api.get(
    `/projects/${projectId}/reports/${reportId}/download`,
    { responseType: 'blob' },
  );
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
