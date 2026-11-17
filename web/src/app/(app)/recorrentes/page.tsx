/**
 * Rota de recorrentes.
 *
 * @module app/(app)/recorrentes/page
 */
import type { Metadata } from 'next';
import { RecurrencesView } from './RecurrencesView';

export const metadata: Metadata = { title: 'Recorrentes' };

/** Tela autenticada, montada só no navegador — ver o `instant` de `app/(app)/layout.tsx`. */
export const instant = false;

/**
 * Página de recorrentes.
 *
 * @returns Tela de recorrentes
 */
export default function Page() {
  return <RecurrencesView />;
}
