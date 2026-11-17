/**
 * Esqueleto de carregamento da rota `/lancamentos`.
 *
 * Só compõe o `TransactionsPageSkeleton` da tela — o mesmo que a tela mostra
 * enquanto os dados carregam.
 *
 * @module app/(app)/lancamentos/loading
 */
import { TransactionsPageSkeleton } from './TransactionsView';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Página de lançamentos em esqueleto
 */
export default function Loading() {
  return <TransactionsPageSkeleton />;
}
