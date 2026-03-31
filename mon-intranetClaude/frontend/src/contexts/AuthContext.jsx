// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken, getAccessToken } from '../api/apiClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // true = on vérifie la session au démarrage

  // Tentative de restauration de session via refresh token (cookie httpOnly)
  useEffect(() => {
    async function restoreSession() {
      try {
        const data = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!data.ok) throw new Error('Pas de session');
        const { accessToken } = await data.json();
        setAccessToken(accessToken);
        const user = await api.get('/auth/me');
        setCurrentUser(user);
      } catch {
        // Pas de session valide → affichage de la page login
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // Écouter l'événement d'expiration forcée
  useEffect(() => {
    const handler = () => {
      setCurrentUser(null);
      setAccessToken(null);
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!data.ok) {
      const err = await data.json();
      throw new Error(err.error || 'Identifiants invalides');
    }
    const { accessToken, user, mustChangePassword } = await data.json();
    setAccessToken(accessToken);
    setCurrentUser({ ...user, mustChangePassword: !!mustChangePassword });
    return { ...user, mustChangePassword: !!mustChangePassword };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    setAccessToken(null);
    setCurrentUser(null);
  }, []);

  const updateCurrentUser = useCallback((updates) => {
    setCurrentUser((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
