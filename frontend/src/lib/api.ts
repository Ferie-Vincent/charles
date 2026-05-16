import axios from 'axios';

// Attach _silentOn403: true on a request config to skip the global 403 toast.
declare module 'axios' {
  interface AxiosRequestConfig { _silentOn403?: boolean }
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

api.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const data = err.response?.data;

    if (status === 419) {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: 'Session expirée ou token CSRF invalide. Rechargez la page.',
      }));
    } else if (status === 403 && !err.config?._silentOn403) {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: data?.message ?? 'Accès refusé (403).',
      }));
    } else if (status === 401) {
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
