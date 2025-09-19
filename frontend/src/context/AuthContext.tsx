'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE } from '../lib/api';

type User = { userId: string; role: 'superadmin'|'admin'|'doctor'|'patient' } | null;
type Ctx = { user: User; refresh: () => Promise<void> };
const AuthCtx = createContext<Ctx>({ user: null, refresh: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const refresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
      if (res.ok) setUser(await res.json());
      else setUser(null);
    } catch { setUser(null); }
  };
  useEffect(() => { void refresh(); }, []);
  return <AuthCtx.Provider value={{ user, refresh }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
