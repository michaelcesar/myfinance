/**
 * Todos os lançamentos, de todos os livros.
 *
 * @module app/(app)/lancamentos/TransactionsView
 */
'use client';

import { Plus } from 'lucide-react';
import { TransactionsPanel, TransactionsPanelSkeleton, transactionsQuery } from '@/components/finance/TransactionsPanel';
import { PAGE_STACK_CLASS, PageHeader } from '@/components/layout/PageHeader';
import { PeriodPicker, PeriodPickerSkeleton } from '@/components/layout/PeriodPicker';
import { useQuickAdd } from '@/components/layout/QuickAddProvider';
import { Button } from '@/components/ui/Button';
import { ButtonSkeleton, PageHeaderSkeleton } from '@/components/ui/SkeletonKit';
import { useTransactions } from '@/hooks/useFinance';
import { usePeriod } from '@/providers/PeriodProvider';

const PAGE_TITLE = 'Lançamentos';
const PAGE_SUBTITLE = 'Receitas, despesas e transferências de todos os livros.';

/** Rótulo do botão de novo lançamento. */
const NEW_TRANSACTION_LABEL = 'Lançamento';

/** O botão do cabeçalho some no celular (lá o botão flutuante faz o papel). */
const NEW_TRANSACTION_CLASS = 'max-md:hidden';

/**
 * Esqueleto da tela de lançamentos — usado pelo `loading.tsx` e enquanto a
 * primeira página carrega.
 *
 * @returns Página em esqueleto
 */
export function TransactionsPageSkeleton() {
  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeaderSkeleton
        title={PAGE_TITLE}
        subtitle={PAGE_SUBTITLE}
        actions={
          <>
            <PeriodPickerSkeleton />
            <ButtonSkeleton label={NEW_TRANSACTION_LABEL} icon className={NEW_TRANSACTION_CLASS} />
          </>
        }
      />
      <TransactionsPanelSkeleton />
    </div>
  );
}

/**
 * Tela de lançamentos.
 *
 * @returns Cabeçalho e painel de lançamentos
 */
export function TransactionsView() {
  const { open } = useQuickAdd();
  const { from, to } = usePeriod();
  const transactions = useTransactions(transactionsQuery({ from, to }));

  if (transactions.isPending) return <TransactionsPageSkeleton />;

  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeader
        title={PAGE_TITLE}
        subtitle={PAGE_SUBTITLE}
        actions={
          <>
            <PeriodPicker />
            <Button icon={<Plus className='size-4' strokeWidth={2.6} />} onClick={() => open()} className={NEW_TRANSACTION_CLASS}>
              {NEW_TRANSACTION_LABEL}
            </Button>
          </>
        }
      />
      <TransactionsPanel />
    </div>
  );
}
