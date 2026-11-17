/**
 * Folha com os lançamentos pagos por trás de um número da análise (uma
 * categoria ou uma origem de receita, no período e livro escolhidos).
 *
 * @module components/finance/analysis/DrilldownSheet
 */
'use client';

import { Receipt } from 'lucide-react';
import { TransactionList, TransactionListSkeleton } from '@/components/finance/TransactionList';
import { useQuickAdd } from '@/components/layout/QuickAddProvider';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Sheet } from '@/components/ui/Sheet';
import { useTransactions } from '@/hooks/useFinance';

/** O que filtrar: tipo, categoria (ou sem categoria), só avulsos e o período. */
export interface DrilldownFilter {
  title: string;
  kind: 'INCOME' | 'EXPENSE';
  /** Id da categoria; `null` = sem categoria; ausente = qualquer. */
  categoryId?: string | null;
  /** Só lançamentos sem recorrente (ex.: "Outras receitas"). */
  onlyOneOff?: boolean;
  from: string;
  to: string;
  ledgerId?: string;
}

/**
 * Último dia de um mês `YYYY-MM-01`.
 *
 * @param month - Mês
 * @returns Data `YYYY-MM-DD`
 */
function lastDay(month: string): string {
  const [year, index] = month.split('-').map(Number);
  return new Date(Date.UTC(year, index, 0)).toISOString().slice(0, 10);
}

/**
 * Lista dos lançamentos do filtro; tocar num deles abre a folha de edição.
 *
 * @param props - Filtro
 * @returns Lista, estado vazio ou erro
 */
function DrilldownList({ filter }: { filter: DrilldownFilter }) {
  const quickAdd = useQuickAdd();
  const query = {
    limit: 200,
    'filter.status': '$eq:PAID',
    'filter.kind': `$eq:${filter.kind}`,
    'filter.date': `$btw:${filter.from},${lastDay(filter.to)}`,
    ...(filter.categoryId === null ? { 'filter.categoryId': '$null' } : filter.categoryId ? { 'filter.categoryId': `$eq:${filter.categoryId}` } : {}),
    ...(filter.onlyOneOff ? { 'filter.recurrenceId': '$null' } : {}),
    ...(filter.ledgerId ? { 'filter.ledgerId': `$eq:${filter.ledgerId}` } : {}),
  };
  const transactions = useTransactions(query);
  if (transactions.isPending) return <TransactionListSkeleton />;
  if (transactions.isError) return <ErrorState message={transactions.error.message} onRetry={() => void transactions.refetch()} />;
  if (!transactions.data.data.length) return <EmptyState icon={Receipt} title='Nenhum lançamento pago' message='Não há lançamentos pagos para isso no período escolhido.' />;
  return <TransactionList transactions={transactions.data.data} showLedger={!filter.ledgerId} onSelect={transaction => quickAdd.open({ transaction })} />;
}

/**
 * Folha de detalhamento.
 *
 * @param props - Filtro (aberta quando presente) e callback de fechar
 * @returns Folha
 *
 * @example
 * <DrilldownSheet filter={{ title: 'Mercado', kind: 'EXPENSE', categoryId, from, to }} onClose={() => setFilter(null)} />
 */
export function DrilldownSheet({ filter, onClose }: { filter: DrilldownFilter | null; onClose: () => void }) {
  return (
    <Sheet open={!!filter} onOpenChange={open => !open && onClose()} title={filter?.title ?? ''} description='Lançamentos pagos no período. Toque num deles para editar.' size='lg'>
      {filter && <DrilldownList filter={filter} />}
    </Sheet>
  );
}
