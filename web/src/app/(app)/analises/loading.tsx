/**
 * Esqueleto de carregamento da rota `/analises`.
 *
 * Só compõe o `AnalysisPageSkeleton` da tela — o mesmo que a tela mostra
 * enquanto os dados carregam.
 *
 * @module app/(app)/analises/loading
 */
import { AnalysisPageSkeleton } from './AnalysisView';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Página de análises em esqueleto
 */
export default function Loading() {
  return <AnalysisPageSkeleton />;
}
