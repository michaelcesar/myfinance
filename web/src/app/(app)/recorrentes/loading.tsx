/**
 * Esqueleto de carregamento da rota `/recorrentes`.
 *
 * Só compõe o `RecurrencesPageSkeleton` da tela — o mesmo que a tela mostra
 * enquanto os dados carregam.
 *
 * @module app/(app)/recorrentes/loading
 */
import { RecurrencesPageSkeleton } from './RecurrencesView';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Página de recorrentes em esqueleto
 */
export default function Loading() {
  return <RecurrencesPageSkeleton />;
}
