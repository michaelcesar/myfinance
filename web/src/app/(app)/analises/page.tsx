/**
 * Rota das análises.
 *
 * @module app/(app)/analises/page
 */
import type { Metadata } from 'next';
import { AnalysisView } from './AnalysisView';

export const metadata: Metadata = { title: 'Análises' };

/** Tela autenticada, montada só no navegador — ver o `instant` de `app/(app)/layout.tsx`. */
export const instant = false;

/**
 * Página das análises.
 *
 * @returns Tela de análises
 */
export default function Page() {
  return <AnalysisView />;
}
