/**
 * Rota de contas.
 *
 * @module app/(app)/contas/page
 */
import type { Metadata } from 'next';
import { AccountsView } from './AccountsView';

export const metadata: Metadata = { title: 'Contas' };

/** Tela autenticada, montada só no navegador — ver o `instant` de `app/(app)/layout.tsx`. */
export const instant = false;

/**
 * Página de contas.
 *
 * @returns Tela de contas
 */
export default function Page() {
  return <AccountsView />;
}
