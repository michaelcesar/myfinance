/**
 * Carteira consolidada de investimentos.
 *
 * @module app/(app)/investimentos/InvestmentsView
 */
'use client';

import { InvestmentsPanel, InvestmentsPanelSkeleton } from '@/components/finance/InvestmentsPanel';
import { Allocation, AllocationSkeleton, Reveal } from '@/components/finance/SummaryBlocks';
import { PAGE_STACK_CLASS, PageHeader } from '@/components/layout/PageHeader';
import { PageHeaderSkeleton } from '@/components/ui/SkeletonKit';
import { useInvestments, useOverview } from '@/hooks/useFinance';
import { usePeriod } from '@/providers/PeriodProvider';

const PAGE_TITLE = 'Investimentos';
const PAGE_SUBTITLE = 'Carteira pessoal e das empresas, com aportes, resgates e rendimentos.';

/**
 * Esqueleto da tela de investimentos — usado pelo `loading.tsx` e enquanto a
 * carteira e o resumo carregam.
 *
 * @returns Página em esqueleto
 */
export function InvestmentsPageSkeleton() {
  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeaderSkeleton title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} />
      <AllocationSkeleton />
      <InvestmentsPanelSkeleton />
    </div>
  );
}

/**
 * Tela de investimentos: alocação por classe e a lista de ativos. Espera a
 * carteira (a mesma query do painel) e o resumo da alocação juntos.
 *
 * @returns Cabeçalho, alocação e carteira
 */
export function InvestmentsView() {
  const period = usePeriod();
  const overview = useOverview({ from: period.from, to: period.to });
  const investments = useInvestments();

  if (investments.isPending || overview.isPending) return <InvestmentsPageSkeleton />;

  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeader title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} />
      {overview.data && overview.data.allocation.length > 0 && (
        <Reveal>
          <Allocation summary={overview.data} />
        </Reveal>
      )}
      <InvestmentsPanel />
    </div>
  );
}
