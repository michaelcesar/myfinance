/**
 * Composição dos provedores globais, na ordem de dependência.
 *
 * @module providers/AppProviders
 */
'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { QueryProvider } from './QueryProvider';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './ToastProvider';

/**
 * Tema → avisos → cache de dados → sessão. A sessão usa o cache (limpa ao
 * sair) e o cache usa os avisos (erro de mutação vira aviso).
 *
 * @param props - `children`
 * @returns Árvore com todos os provedores
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
