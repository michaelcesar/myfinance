/**
 * Rota de investimentos.
 *
 * @module app/(app)/investimentos/page
 */
import type { Metadata } from 'next';
import { InvestmentsView } from './InvestmentsView';

export const metadata: Metadata = { title: 'Investimentos' };

/** Tela autenticada, montada só no navegador — ver o `instant` de `app/(app)/layout.tsx`. */
export const instant = false;

/**
 * Página de investimentos.
 *
 * @returns Tela de investimentos
 */
export default function Page() {
  return <InvestmentsView />;
}
