/**
 * Rota da visão geral.
 *
 * @module app/(app)/visao-geral/page
 */
import type { Metadata } from 'next';
import { OverviewView } from './OverviewView';

export const metadata: Metadata = { title: 'Visão geral' };

/** Tela autenticada, montada só no navegador — ver o `instant` de `app/(app)/layout.tsx`. */
export const instant = false;

/**
 * Página da visão geral consolidada.
 *
 * @returns Visão geral
 */
export default function OverviewPage() {
  return <OverviewView />;
}
