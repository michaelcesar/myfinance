/**
 * Layout do grupo de telas autenticadas.
 *
 * @module app/(app)/layout
 */
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';

/**
 * Fora da validação de navegação instantânea do Cache Components.
 *
 * As telas daqui só existem depois que a sessão é restaurada no navegador
 * (o access token vive em memória — `ADR-003` da API): no prerender não há
 * usuário, então a moldura mostra a abertura e a página não é renderizada.
 * Esse bloqueio é proposital, e é exatamente o caso que `instant = false`
 * existe para declarar (`ADR-004` do web).
 */
export const instant = false;

/**
 * Envolve as telas autenticadas na moldura do app.
 *
 * @param props - `children`
 * @returns Moldura com o conteúdo
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
