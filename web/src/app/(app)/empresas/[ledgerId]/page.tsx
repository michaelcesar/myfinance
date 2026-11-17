/**
 * Rota de uma empresa.
 *
 * @module app/(app)/empresas/[ledgerId]/page
 */
import type { Metadata } from 'next';
import { CompanyView } from './CompanyView';

export const metadata: Metadata = { title: 'Empresa' };

/** Tela autenticada, montada só no navegador — ver o `instant` de `app/(app)/layout.tsx`. */
export const instant = false;

/**
 * Página da empresa. O id é lido no cliente (`useParams`), dentro do
 * `Suspense` da moldura do app.
 *
 * @returns Tela da empresa
 */
export default function CompanyPage() {
  return <CompanyView />;
}
