// src/api/apiClient.js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// URL de base du serveur (sans /api) — partagée par les composants qui en ont besoin
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || BASE_URL.replace('/api', '');

let accessToken = null;
let isRefreshing = false;
let pendingRequests = [];

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken() {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Session expirée');
  const data = await res.json();
  accessToken = data.accessToken;
  return accessToken;
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && !options._retry) {
    if (isRefreshing) {
      // Attendre que le refresh soit terminé
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then(() => request(path, { ...options, _retry: true }));
    }

    isRefreshing = true;
    try {
      await refreshAccessToken();
      pendingRequests.forEach(({ resolve }) => resolve());
      pendingRequests = [];
      return request(path, { ...options, _retry: true });
    } catch (err) {
      pendingRequests.forEach(({ reject }) => reject(err));
      pendingRequests = [];
      // Déclencher un événement pour forcer le logout
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(err.error || 'Erreur serveur');
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  // Pour les uploads FormData (Content-Type géré automatiquement par le browser)
  postForm: (path, formData) => request(path, { method: 'POST', body: formData }),
};

export default api;
