/**
 * Lançamentos do período com busca e filtros.
 *
 * @module components/finance/TransactionsPanel
 */
'use client';

import { ArrowLeftRight, Plus, Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { useQuickAdd } from '@/components/layout/QuickAddProvider';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { CONTROL_CLASS } from '@/components/ui/Field';
import { Money } from '@/components/ui/Money';
import { SegmentedControl, SegmentedControlSkeleton } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { SkeletonText } from '@/components/ui/SkeletonKit';
import { useTransactions } from '@/hooks/useFinance';
import { cn } from '@/lib/cn';
import { usePeriod } from '@/providers/PeriodProvider';
import { TransactionList, TransactionListSkeleton } from './TransactionList';

/** Filtro por tipo de lançamento. */
export type KindFilter = 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';

const KIND_FILTERS: Record<KindFilter, string | undefined> = {
  ALL: undefined,
  INCOME: '$eq:INCOME',
  EXPENSE: '$eq:EXPENSE',
  TRANSFER: '$in:TRANSFER_IN,TRANSFER_OUT',
};

/** Opções do filtro por tipo — o controle e o esqueleto usam as mesmas. */
const KIND_SEGMENTS: { value: KindFilter; label: string }[] = [
  { value: 'ALL', label: 'Tudo' },
  { value: 'INCOME', label: 'Receitas' },
  { value: 'EXPENSE', label: 'Despesas' },
  { value: 'TRANSFER', label: 'Transferências' },
];

/** Tamanho de cada página carregada. */
const PAGE_SIZE = 50;

/** Barra de busca e filtro. */
const TOOLBAR_CLASS = 'mb-5 flex flex-col gap-3 md:flex-row md:items-center';

/** Caixa do campo de busca. */
const SEARCH_BOX_CLASS = 'relative flex-1';

/** Altura do campo de busca (mais baixo que o campo de formulário). */
const SEARCH_HEIGHT_CLASS = 'h-9';

/** Linha de totais acima da lista. */
const SUMMARY_CLASS = 'mb-4 flex flex-wrap gap-x-5 gap-y-1 px-1 text-footnote text-fg-muted';

/** Parâmetros da consulta de lançamentos do painel. */
export interface TransactionsQueryOptions {
  from: string;
  to: string;
  kind?: KindFilter;
  search?: string;
  limit?: number;
  ledgerId?: string;
}

/**
 * Monta a consulta de lançamentos do painel. A tela usa a mesma, com os
 * filtros iniciais, para esperar a primeira página (a chave da query é a mesma).
 *
 * @param options - Período, tipo, busca, limite e livro
 * @returns Consulta no formato do `nestjs-paginate`
 *
 * @example
 * useTransactions(transactionsQuery({ from, to }));
 */
export function transactionsQuery({ from, to, kind = 'ALL', search = '', limit = PAGE_SIZE, ledgerId }: TransactionsQueryOptions): Parameters<typeof useTransactions>[0] {
  return {
    limit,
    search: search.trim() || undefined,
    'filter.date': `$btw:${from},${to}`,
    'filter.kind': KIND_FILTERS[kind],
    'filter.ledgerId': ledgerId ? `$eq:${ledgerId}` : undefined,
  };
}

/**
 * Esqueleto dos resultados: a linha de totais e a lista agrupada.
 *
 * @returns Resultados em esqueleto
 */
function TransactionsResultsSkeleton() {
  return (
    <div aria-hidden>
      <div className={SUMMARY_CLASS}>
        <SkeletonText className='w-auto' width={96} />
        <SkeletonText className='w-auto' width={136} />
        <SkeletonText className='w-auto' width={136} />
      </div>
      <TransactionListSkeleton />
    </div>
  );
}

/**
 * Esqueleto do painel de lançamentos: busca, filtro por tipo, totais e lista.
 *
 * @returns Painel em esqueleto
 *
 * @example
 * <TransactionsPanelSkeleton />
 */
export function TransactionsPanelSkeleton() {
  return (
    <div aria-hidden>
      <div className={TOOLBAR_CLASS}>
        <div className={SEARCH_BOX_CLASS}>
          <Skeleton className={cn('w-full rounded-control', SEARCH_HEIGHT_CLASS)} />
        </div>
        <SegmentedControlSkeleton labels={KIND_SEGMENTS.map(segment => segment.label)} size='sm' />
      </div>
      <TransactionsResultsSkeleton />
    </div>
  );
}

/**
 * Painel de lançamentos de um livro (ou de todos), no período escolhido.
 *
 * @param props - Livro (opcional)
 * @returns Filtros, totais e lista agrupada
 */
export function TransactionsPanel({ ledgerId }: { ledgerId?: string }) {
  const { from, to, label } = usePeriod();
  const { open } = useQuickAdd();
  const [kind, setKind] = useState<KindFilter>('ALL');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const deferredSearch = useDeferredValue(search);

  const transactions = useTransactions(transactionsQuery({ from, to, kind, search: deferredSearch, limit, ledgerId }));

  const items = transactions.data?.data ?? [];
  const income = items.filter(item => item.kind === 'INCOME').reduce((sum, item) => sum + item.amountCents, 0);
  const expense = items.filter(item => item.kind === 'EXPENSE').reduce((sum, item) => sum + item.amountCents, 0);
  const total = transactions.data?.meta.totalItems ?? 0;

  return (
    <div>
      <div className={TOOLBAR_CLASS}>
        <div className={SEARCH_BOX_CLASS}>
          <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle' />
          <input
            type='search'
            aria-label='Buscar lançamentos'
            placeholder='Buscar'
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setLimit(PAGE_SIZE);
            }}
            className={cn(CONTROL_CLASS, SEARCH_HEIGHT_CLASS, 'bg-fill pl-9')}
          />
        </div>
        <SegmentedControl
          label='Filtrar por tipo'
          size='sm'
          segments={KIND_SEGMENTS}
          value={kind}
          onChange={next => {
            setKind(next);
            setLimit(PAGE_SIZE);
          }}
        />
      </div>

      {transactions.isPending ? (
        <TransactionsResultsSkeleton />
      ) : transactions.isError ? (
        <ErrorState message={transactions.error.message} onRetry={() => void transactions.refetch()} />
      ) : items.length ? (
        <>
          <div className={SUMMARY_CLASS}>
            <span>
              {total} {total === 1 ? 'lançamento' : 'lançamentos'}
            </span>
            {income > 0 && (
              <span>
                Receitas <Money cents={income} className='font-semibold text-success' />
              </span>
            )}
            {expense > 0 && (
              <span>
                Despesas <Money cents={expense} className='font-semibold text-fg' />
              </span>
            )}
          </div>
          <div className={cn('transition-opacity', transactions.isPlaceholderData && 'opacity-60')}>
            <TransactionList transactions={items} showLedger={!ledgerId} onSelect={transaction => open({ transaction })} />
          </div>
          {items.length < total && (
            <div className='mt-4 flex justify-center'>
              <Button variant='secondary' loading={transactions.isFetching} onClick={() => setLimit(current => current + PAGE_SIZE)}>
                Carregar mais
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={ArrowLeftRight}
          title={search ? 'Nada encontrado' : 'Nenhum lançamento'}
          message={search ? `Nenhum lançamento com “${search}” em ${label.toLowerCase()}.` : `Nenhum lançamento em ${label.toLowerCase()}.`}
          action={
            <Button icon={<Plus className='size-4' />} onClick={() => open({ ledgerId })}>
              Novo lançamento
            </Button>
          }
        />
      )}
    </div>
  );
}
