/**
 * Todos os recorrentes (contratos e contas fixas), de todos os livros.
 *
 * @module app/(app)/recorrentes/RecurrencesView
 */
'use client';

import { RecurrencesPanel, RecurrencesPanelSkeleton } from '@/components/finance/RecurrencesPanel';
import { PAGE_STACK_CLASS, PageHeader } from '@/components/layout/PageHeader';
import { PageHeaderSkeleton } from '@/components/ui/SkeletonKit';
import { useRecurrences } from '@/hooks/useFinance';

const PAGE_TITLE = 'Recorrentes';
const PAGE_SUBTITLE = 'Contratos e contas fixas. O sistema mantém os próximos meses como pendentes.';

/**
 * Esqueleto da tela de recorrentes — usado pelo `loading.tsx` e enquanto os recorrentes carregam.
 *
 * @returns Página em esqueleto
 */
export function RecurrencesPageSkeleton() {
  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeaderSkeleton title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} />
      <RecurrencesPanelSkeleton />
    </div>
  );
}

/**
 * Tela de recorrentes. Espera a mesma query do painel (sem filtros).
 *
 * @returns Cabeçalho e lista de recorrentes
 */
export function RecurrencesView() {
  const recurrences = useRecurrences();

  if (recurrences.isPending) return <RecurrencesPageSkeleton />;

  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeader title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} />
      <RecurrencesPanel />
    </div>
  );
}
