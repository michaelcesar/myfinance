/**
 * Esqueleto de carregamento da rota `/empresas/[ledgerId]`.
 *
 * Só compõe o `CompanyPageSkeleton` da tela — o mesmo que a tela mostra
 * enquanto a empresa carrega.
 *
 * @module app/(app)/empresas/[ledgerId]/loading
 */
import { CompanyPageSkeleton } from './CompanyView';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Empresa em esqueleto
 */
export default function Loading() {
  return <CompanyPageSkeleton />;
}
