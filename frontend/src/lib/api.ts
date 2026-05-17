/**
 * Instance Axios partagée pour toute l'application.
 *
 * Auth : Laravel Sanctum en mode cookie (session), pas de Bearer token.
 * - `withCredentials: true` est obligatoire — sans ça, le cookie de session
 *   n'est pas envoyé et toutes les requêtes retournent 401.
 * - Le token XSRF est lu depuis le cookie `XSRF-TOKEN` et injecté en header
 *   sur chaque requête mutante (POST/PATCH/PUT/DELETE) pour la protection CSRF.
 *
 * Ne jamais importer `axios` directement dans les features — toujours importer `api` ici.
 */

import axios from 'axios';
import { enqueueRequest, replayQueue } from './offline-queue';

// Permet de passer _silentOn403/_silentOn401 dans la config d'une requête
// pour désactiver les toasts d'erreur globaux sur certains appels silencieux.
declare module 'axios' {
  interface AxiosRequestConfig {
    _silentOn403?: boolean;
    _silentOn401?: boolean;
  }
}

export const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  // Obligatoire pour Sanctum cookie-based auth
  withCredentials: true,
});

// Injecte le XSRF-TOKEN depuis le cookie dans chaque requête.
// Laravel valide ce header pour prévenir les attaques CSRF.
api.interceptors.request.use(config => {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
  if (match) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(match[1]);
  }
  return config;
});

// Rejoue les mutations en attente quand la connexion est rétablie (PWA offline)
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

    // Si hors-ligne : mettre en file les mutations pour replay ultérieur
    if (!navigator.onLine && !err.response && err.config) {
      const method = (err.config.method ?? '').toLowerCase();
      if (MUTATION_METHODS.has(method)) {
        enqueueRequest(method, err.config.url!, JSON.parse(err.config.data ?? 'null'));
        window.dispatchEvent(new CustomEvent('offline-queued', { detail: { url: err.config.url } }));
        return Promise.reject(err);
      }
    }

    // 419 = token CSRF expiré (session expirée ou rechargement forcé)
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
