/**
 * Esqueleto de carregamento da rota `/contas`.
 *
 * Só compõe o `AccountsPageSkeleton` da tela — o mesmo que a tela mostra
 * enquanto os dados carregam.
 *
 * @module app/(app)/contas/loading
 */
import { AccountsPageSkeleton } from './AccountsView';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Página de contas em esqueleto
 */
export default function Loading() {
  return <AccountsPageSkeleton />;
}
