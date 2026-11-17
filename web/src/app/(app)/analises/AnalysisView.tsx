/**
 * Análises para decidir: onde economizar, onde dá para gastar mais, quais
 * receitas são confiáveis e o que está crescendo — sobre o que já foi pago.
 *
 * @module app/(app)/analises/AnalysisView
 */
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AnalysisInsights,
  AnalysisSectionSkeleton,
  CategoryTrends,
  ExpenseRanking,
  ExpenseRankingSkeleton,
  FixedVariable,
  IncomeOrigins,
  SavingsSection,
} from '@/components/finance/analysis/AnalysisSections';
import { type AnalysisPreset, type AnalysisRange, analysisRange, dataWindow, MAX_PERIOD_MONTHS } from '@/components/finance/analysis/analysisMath';
import { type DrilldownFilter, DrilldownSheet } from '@/components/finance/analysis/DrilldownSheet';
import { RecurrenceSheet } from '@/components/finance/RecurrenceSheet';
import { useQuickAdd } from '@/components/layout/QuickAddProvider';
import { PAGE_STACK_CLASS, PageHeader } from '@/components/layout/PageHeader';
import { ErrorState } from '@/components/ui/Feedback';
import { Select, TextInput } from '@/components/ui/Field';
import { FieldSkeleton, PageHeaderSkeleton } from '@/components/ui/SkeletonKit';
import { useAnalysis, useLedgers, useRecurrences } from '@/hooks/useFinance';
import { formatMonthLong, todayIso } from '@/lib/format';
import { ledgerOptions } from '@/lib/options';
import { transactionsService } from '@/services/finance.service';
import type { Analysis, AnalysisCategory, AnalysisOrigin } from '@/types/entities';

const PAGE_TITLE = 'Análises';
const PAGE_SUBTITLE = 'Onde economizar, onde dá para gastar mais e quão confiáveis são suas receitas, com base no que já foi pago.';

/** Atalhos de período. */
const PRESET_OPTIONS: { value: AnalysisPreset; label: string }[] = [
  { value: 'last3', label: 'Últimos 3 meses' },
  { value: 'last6', label: 'Últimos 6 meses' },
  { value: 'last12', label: 'Últimos 12 meses' },
  { value: 'thisYear', label: 'Este ano' },
  { value: 'custom', label: 'Personalizado' },
];

/** Linha dos filtros. */
const FILTERS_CLASS = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-start';

/**
 * Esqueleto das análises — usado pelo `loading.tsx` e enquanto os dados carregam.
 *
 * @returns Página em esqueleto
 */
export function AnalysisPageSkeleton() {
  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeaderSkeleton title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} />
      <div className={FILTERS_CLASS} aria-hidden>
        <FieldSkeleton labelWidth={40} />
        <FieldSkeleton labelWidth={56} />
      </div>
      <AnalysisSectionSkeleton title='O que fazer agora' height='h-[180px]' />
      <ExpenseRankingSkeleton />
      <AnalysisSectionSkeleton title='Onde economizar' />
      <AnalysisSectionSkeleton title='Receitas' />
    </div>
  );
}

/**
 * Tela de análises.
 *
 * @returns Filtros e seções
 */
export function AnalysisView() {
  const current = todayIso().slice(0, 7);
  const ledgers = useLedgers();
  const [ledgerId, setLedgerId] = useState('');
  const [preset, setPreset] = useState<AnalysisPreset>('last6');
  const [custom, setCustom] = useState<AnalysisRange>(() => analysisRange('last6', current));
  const range = analysisRange(preset, current, custom);
  const clamped = preset === 'custom' && range.to < (custom.from <= custom.to ? custom.to : custom.from);
  const analysis = useAnalysis({ ...range, ...(ledgerId ? { ledgerId } : {}) });

  if (analysis.isPending) return <AnalysisPageSkeleton />;

  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeader title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} />
      <div className={FILTERS_CLASS}>
        <Select label='Livro' options={[{ value: '', label: 'Todos os livros' }, ...ledgerOptions(ledgers.data ?? [])]} value={ledgerId} onChange={event => setLedgerId(event.target.value)} />
        <Select
          label='Período'
          options={PRESET_OPTIONS}
          value={preset}
          onChange={event => setPreset(event.target.value as AnalysisPreset)}
          hint={
            analysis.data
              ? `Comparado ao período de ${formatMonthLong(analysis.data.previousFrom.slice(0, 7)).toLowerCase()} a ${formatMonthLong(analysis.data.previousTo.slice(0, 7)).toLowerCase()}`
              : undefined
          }
        />
        {preset === 'custom' && (
          <>
            <TextInput label='De' type='month' value={custom.from} onChange={event => event.target.value && setCustom({ ...custom, from: event.target.value })} />
            <TextInput
              label='Até'
              type='month'
              value={custom.to}
              onChange={event => event.target.value && setCustom({ ...custom, to: event.target.value })}
              hint={clamped ? `Até ${MAX_PERIOD_MONTHS} meses por vez. Mostrando até ${range.to}.` : undefined}
            />
          </>
        )}
      </div>
      {analysis.isError || !analysis.data ? (
        <ErrorState message={analysis.error?.message ?? 'Não foi possível carregar a análise.'} onRetry={() => void analysis.refetch()} />
      ) : (
        <AnalysisBody analysis={analysis.data} current={current} ledgerId={ledgerId} />
      )}
    </div>
  );
}

/**
 * Corpo das análises, com as ações de clique de cada seção.
 *
 * @param props - Análise do período, mês atual (`YYYY-MM`) e livro filtrado
 * @returns Seções da tela
 */
function AnalysisBody({ analysis, current, ledgerId }: { analysis: Analysis; current: string; ledgerId: string }) {
  const router = useRouter();
  const quickAdd = useQuickAdd();
  const recurrences = useRecurrences();
  const [openRecurrenceId, setOpenRecurrenceId] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<DrilldownFilter | null>(null);
  const openRecurrence = recurrences.data?.find(item => item.recurrenceId === openRecurrenceId);
  const window = dataWindow(analysis, current);
  const scope = { from: analysis.from, to: analysis.to, ...(ledgerId ? { ledgerId } : {}) };
  const openCategory = (category: AnalysisCategory) => setDrilldown({ title: category.name, kind: 'EXPENSE', categoryId: category.categoryId, ...scope });
  const openOrigin = (origin: AnalysisOrigin) => {
    if (origin.recurrenceId) {
      if (recurrences.data) setOpenRecurrenceId(origin.recurrenceId);
      else router.push('/recorrentes');
      return;
    }
    setDrilldown({ title: origin.name, kind: 'INCOME', categoryId: origin.categoryId, onlyOneOff: true, ...scope });
  };
  const openExpense = async (transactionId: string) => quickAdd.open({ transaction: await transactionsService.get(transactionId) });
  return (
    <>
      <AnalysisInsights analysis={analysis} current={current} />
      <ExpenseRanking analysis={analysis} window={window} onOpenCategory={openCategory} />
      <SavingsSection analysis={analysis} onOpenCategory={openCategory} onOpenExpense={transactionId => void openExpense(transactionId)} />
      <FixedVariable analysis={analysis} onOpenRecurrences={() => router.push('/recorrentes')} onOpenTransactions={() => router.push('/lancamentos')} />
      <IncomeOrigins analysis={analysis} window={window} onOpenOrigin={openOrigin} onOpenTransfers={() => router.push('/lancamentos')} />
      <CategoryTrends analysis={analysis} onOpenCategory={openCategory} />
      <RecurrenceSheet open={!!openRecurrence} onOpenChange={open => !open && setOpenRecurrenceId(null)} recurrence={openRecurrence} />
      <DrilldownSheet filter={drilldown} onClose={() => setDrilldown(null)} />
    </>
  );
}
