/**
 * Esqueleto de carregamento da rota `/visao-geral`.
 *
 * Só compõe o `OverviewPageSkeleton` da tela — o mesmo que a tela mostra
 * enquanto o resumo consolidado carrega.
 *
 * @module app/(app)/visao-geral/loading
 */
import { OverviewPageSkeleton } from './OverviewView';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Visão geral em esqueleto
 */
export default function Loading() {
  return <OverviewPageSkeleton />;
}
