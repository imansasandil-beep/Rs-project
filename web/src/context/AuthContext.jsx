import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, tokenStore, onUnauthorized } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Starts true so the router never flashes the login screen while we are still
  // checking a token that turns out to be perfectly valid.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    api
      .get('/api/auth/me')
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        tokenStore.clear();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // A token that expires mid-session gets rejected by the next request; drop
  // the user rather than leaving them clicking a UI that silently fails.
  useEffect(() => onUnauthorized(() => setUser(null)), []);

  const signIn = useCallback(async (credentials) => {
    const data = await api.post('/api/auth/login', credentials);
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signUp = useCallback(async (details) => {
    const data = await api.post('/api/auth/register', details);
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (changes) => {
    const data = await api.patch('/api/auth/me', changes);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      currency: user?.currency ?? 'LKR',
      signIn,
      signUp,
      signOut,
      updateProfile,
    }),
    [user, loading, signIn, signUp, signOut, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
