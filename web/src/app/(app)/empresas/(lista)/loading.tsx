/**
 * Esqueleto de carregamento da rota `/empresas`.
 *
 * Só compõe o `CompaniesPageSkeleton` da tela — o mesmo que a tela mostra
 * enquanto a lista de livros carrega.
 *
 * @module app/(app)/empresas/(lista)/loading
 */
import { CompaniesPageSkeleton } from './CompaniesView';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Página de empresas em esqueleto
 */
export default function Loading() {
  return <CompaniesPageSkeleton />;
}
