import axios from 'axios';
import { enqueueRequest, replayQueue } from './offline-queue';

// Attach _silentOn403/_silentOn401: true on a request config to skip global error toasts.
declare module 'axios' {
  interface AxiosRequestConfig {
    _silentOn403?: boolean;
    _silentOn401?: boolean;
  }
}

export const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  if (match) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(match[1]);
  }
  return config;
});

// Replay queued mutations when connection is restored
window.addEventListener('online', async () => {
  const { replayed, failed, failedRequests } = await replayQueue(api);
  if (replayed > 0 || failed > 0) {
    window.dispatchEvent(new CustomEvent('offline-replayed', { detail: { replayed, failed, failedRequests } }));
  }
});

const MUTATION_METHODS = new Set(['post', 'patch', 'put', 'delete']);

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const data = err.response?.data;

    // Queue write mutations when offline for later replay
    if (!navigator.onLine && !err.response && err.config) {
      const method = (err.config.method ?? '').toLowerCase();
      if (MUTATION_METHODS.has(method)) {
        enqueueRequest(method, err.config.url!, JSON.parse(err.config.data ?? 'null'));
        window.dispatchEvent(new CustomEvent('offline-queued', { detail: { url: err.config.url } }));
        return Promise.reject(err);
      }
    }

    if (status === 419) {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: 'Session expirée ou token CSRF invalide. Rechargez la page.',
      }));
    } else if (status === 403 && !err.config?._silentOn403) {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: data?.message ?? 'Accès refusé (403).',
      }));
    } else if (status === 401 && !err.config?._silentOn401) {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: 'Non authentifié. Reconnectez-vous.',
      }));
    } else if (status >= 500) {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: data?.message ?? `Erreur serveur (${status}).`,
      }));
    }
    return Promise.reject(err);
  }
);
