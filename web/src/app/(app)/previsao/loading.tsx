/**
 * Esqueleto de carregamento da rota `/previsao`.
 *
 * Só compõe o `ForecastPageSkeleton` da tela — o mesmo que a tela mostra
 * enquanto os dados carregam.
 *
 * @module app/(app)/previsao/loading
 */
import { ForecastPageSkeleton } from './ForecastView';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Página de previsão em esqueleto
 */
export default function Loading() {
  return <ForecastPageSkeleton />;
}
