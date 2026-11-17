/**
 * Rota do livro pessoal.
 *
 * @module app/(app)/pessoal/page
 */
import type { Metadata } from 'next';
import { PersonalView } from './PersonalView';

export const metadata: Metadata = { title: 'Pessoal' };

/** Tela autenticada, montada só no navegador — ver o `instant` de `app/(app)/layout.tsx`. */
export const instant = false;

/**
 * Página do livro pessoal.
 *
 * @returns Livro pessoal
 */
export default function PersonalPage() {
  return <PersonalView />;
}
