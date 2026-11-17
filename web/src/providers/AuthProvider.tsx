/**
 * Estado da sessão do usuário.
 *
 * Na montagem, tenta restaurar a sessão pelo cookie (`POST /auth/refresh`):
 * o access token recarregado nunca saiu da memória, então todo reload passa
 * por aqui. Sem sessão, as telas protegidas mandam para `/entrar`.
 *
 * @module providers/AuthProvider
 */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { refreshSession, type SessionPayload, setSessionExpiredHandler } from '@/lib/api-client';
import { setAccessToken } from '@/lib/session';
import { authService, type LoginInput, type RegisterInput } from '@/services/auth.service';
import type { User } from '@/types/entities';

/** Situação da sessão. */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Provedor da sessão.
 *
 * @param props - `children`
 * @returns Conteúdo com o contexto de sessão
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  const accept = useCallback((session: SessionPayload) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    refreshSession()
      .then(session => active && accept(session))
      .catch(() => active && setStatus('anonymous'));
    return () => {
      active = false;
    };
  }, [accept]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      clear();
      router.replace('/entrar');
    });
    return () => setSessionExpiredHandler(null);
  }, [clear, router]);

  const login = useCallback(async (input: LoginInput) => accept(await authService.login(input)), [accept]);
  const register = useCallback(async (input: RegisterInput) => accept(await authService.register(input)), [accept]);
  const logout = useCallback(async () => {
    await authService.logout().catch(() => null);
    clear();
    router.replace('/entrar');
  }, [clear, router]);

  const value = useMemo(() => ({ status, user, login, register, logout, setUser }), [status, user, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Acessa a sessão.
 *
 * @returns Situação, usuário e ações
 * @throws `Error` fora do `AuthProvider`
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}
