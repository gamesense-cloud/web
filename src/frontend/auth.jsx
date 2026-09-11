import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [badges, setBadges] = useState({ tickets: 0, resets: 0 });
  const [subscription, setSubscription] = useState(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return null;
    }
    try {
      const data = await api.me();
      setUser(data.user);
      setBadges(data.badges ?? { tickets: 0, resets: 0 });
      setSubscription(data.subscription ?? null);
      return data.user;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({
    user,
    badges,
    subscription,
    ready,
    isAdmin: user?.role === 'admin',
    refresh,

    async login(identifier, password) {
      const data = await api.login(identifier, password);
      setToken(data.token);
      setUser(data.user);
      await refresh();
      return data.user;
    },

    async register(username, email, password) {
      const data = await api.register(username, email, password);
      setToken(data.token);
      setUser(data.user);
      await refresh();
      return data.user;
    },

    async logout() {
      try { await api.logout(); } catch { /* the token is going away regardless */ }
      setToken(null);
      setUser(null);
      setBadges({ tickets: 0, resets: 0 });
      setSubscription(null);
    },
  }), [user, badges, subscription, ready, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthProvider;
