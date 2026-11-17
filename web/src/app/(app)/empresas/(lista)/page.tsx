/**
 * Rota da lista de empresas.
 *
 * @module app/(app)/empresas/(lista)/page
 */
import type { Metadata } from 'next';
import { CompaniesView } from './CompaniesView';

export const metadata: Metadata = { title: 'Empresas' };

/** Tela autenticada, montada só no navegador — ver o `instant` de `app/(app)/layout.tsx`. */
export const instant = false;

/**
 * Página das empresas.
 *
 * @returns Lista de empresas
 */
export default function CompaniesPage() {
  return <CompaniesView />;
}
