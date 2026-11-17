/**
 * Esqueleto de carregamento da rota `/investimentos`.
 *
 * Só compõe o `InvestmentsPageSkeleton` da tela — o mesmo que a tela mostra
 * enquanto os dados carregam.
 *
 * @module app/(app)/investimentos/loading
 */
import { InvestmentsPageSkeleton } from './InvestmentsView';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Página de investimentos em esqueleto
 */
export default function Loading() {
  return <InvestmentsPageSkeleton />;
}
