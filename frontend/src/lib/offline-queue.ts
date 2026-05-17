import type { AxiosInstance } from 'axios';

interface QueuedRequest {
  method: string;
  url: string;
  data: unknown;
  timestamp: number;
}

const QUEUE_KEY = 'charles_offline_queue';

function getQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function enqueueRequest(method: string, url: string, data: unknown): void {
  const queue = getQueue();
  queue.push({ method, url, data, timestamp: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getPendingCount(): number {
  return getQueue().length;
}

export interface ReplayResult {
  replayed: number;
  failed: number;
  failedRequests: QueuedRequest[];
}

export async function replayQueue(axiosInstance: AxiosInstance): Promise<ReplayResult> {
  const queue = getQueue();
  if (!queue.length) return { replayed: 0, failed: 0, failedRequests: [] };

  localStorage.removeItem(QUEUE_KEY);

  let replayed = 0;
  const failedRequests: QueuedRequest[] = [];

  for (const req of queue) {
    try {
      await axiosInstance.request({ method: req.method, url: req.url, data: req.data });
      replayed++;
    } catch {
      failedRequests.push(req);
    }
  }

  // Persist failed items back — they can be retried on next reconnection
  if (failedRequests.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failedRequests));
  }

  return { replayed, failed: failedRequests.length, failedRequests };
}
