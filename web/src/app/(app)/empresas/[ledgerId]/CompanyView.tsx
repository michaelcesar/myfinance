/**
 * Tela de uma empresa.
 *
 * @module app/(app)/empresas/[ledgerId]/CompanyView
 */
'use client';

import { useParams } from 'next/navigation';
import { LedgerPageSkeleton, LedgerView } from '@/components/finance/LedgerView';
import { ErrorState } from '@/components/ui/Feedback';
import { useLedger } from '@/hooks/useFinance';

/**
 * Esqueleto da tela de uma empresa — usado pelo `loading.tsx` e enquanto a
 * empresa carrega.
 *
 * @returns Página em esqueleto
 */
export function CompanyPageSkeleton() {
  return <LedgerPageSkeleton ledgerType='COMPANY' />;
}

/**
 * Carrega a empresa pelo id da URL e mostra a tela de livro.
 *
 * @returns Tela da empresa
 */
export function CompanyView() {
  const { ledgerId } = useParams<{ ledgerId: string }>();
  const ledger = useLedger(ledgerId);
  if (ledger.isPending) return <CompanyPageSkeleton />;
  if (ledger.isError) return <ErrorState message={ledger.error.message} onRetry={() => void ledger.refetch()} />;
  return <LedgerView key={ledger.data.ledgerId} ledger={ledger.data} />;
}
