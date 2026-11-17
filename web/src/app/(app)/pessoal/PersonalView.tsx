/**
 * Tela do livro pessoal.
 *
 * @module app/(app)/pessoal/PersonalView
 */
'use client';

import { LedgerPageSkeleton, LedgerView } from '@/components/finance/LedgerView';
import { ErrorState } from '@/components/ui/Feedback';
import { useLedgers } from '@/hooks/useFinance';

/**
 * Esqueleto da tela do livro pessoal — usado pelo `loading.tsx` e enquanto
 * os livros carregam.
 *
 * @returns Página em esqueleto
 */
export function PersonalPageSkeleton() {
  return <LedgerPageSkeleton ledgerType='PERSONAL' />;
}

/**
 * Encontra o livro pessoal e mostra a tela de livro.
 *
 * @returns Tela do livro pessoal
 */
export function PersonalView() {
  const ledgers = useLedgers();
  if (ledgers.isPending) return <PersonalPageSkeleton />;
  if (ledgers.isError) return <ErrorState message={ledgers.error.message} onRetry={() => void ledgers.refetch()} />;
  const personal = ledgers.data.find(ledger => ledger.type === 'PERSONAL');
  if (!personal) return <ErrorState message='Livro pessoal não encontrado.' />;
  return <LedgerView ledger={personal} />;
}
