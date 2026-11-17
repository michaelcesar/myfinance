/**
 * Rota de lançamentos.
 *
 * @module app/(app)/lancamentos/page
 */
import type { Metadata } from 'next';
import { TransactionsView } from './TransactionsView';

export const metadata: Metadata = { title: 'Lançamentos' };

/** Tela autenticada, montada só no navegador — ver o `instant` de `app/(app)/layout.tsx`. */
export const instant = false;

/**
 * Página de lançamentos.
 *
 * @returns Tela de lançamentos
 */
export default function Page() {
  return <TransactionsView />;
}
