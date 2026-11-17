/**
 * Previsão em KPIs: o crescimento do patrimônio, realizado e previsto, e
 * quanto sobra em cada mês ou período.
 *
 * @module app/(app)/previsao/ForecastView
 */
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NetWorthChart, NetWorthChartSkeleton } from '@/components/charts/NetWorthChart';
import { ResultBars, ResultBarsSkeleton } from '@/components/charts/ResultBars';
import { ForecastKpis, ForecastKpisSkeleton } from '@/components/finance/forecast/ForecastKpis';
import { RecurrenceSheet } from '@/components/finance/RecurrenceSheet';
import { ForecastTable, ForecastTableSkeleton } from '@/components/finance/forecast/ForecastTable';
import { forecastKpis, MAX_PERIOD_MONTHS, recurringAverages, type MonthRange, monthNetWorth, type PeriodPreset, periodRange } from '@/components/finance/forecast/forecastMath';
import { INCLUDE_ASSETS_LABEL } from '@/components/finance/SummaryBlocks';
import { PAGE_STACK_CLASS, PageHeader } from '@/components/layout/PageHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/Feedback';
import { Select, TextInput } from '@/components/ui/Field';
import { FieldSkeleton, PageHeaderSkeleton, SectionHeaderSkeleton } from '@/components/ui/SkeletonKit';
import { ToggleBadge } from '@/components/ui/ToggleBadge';
import { useForecast, useLedgers, useRecurrences } from '@/hooks/useFinance';
import { todayIso } from '@/lib/format';
import { ledgerOptions } from '@/lib/options';
import type { Forecast } from '@/types/entities';

const PAGE_TITLE = 'Previsão';
const PAGE_SUBTITLE = 'Seu crescimento: o que já aconteceu e o que contratos e pendentes indicam para os próximos meses.';

/** Atalhos de período, na ordem do seletor. */
const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'thisMonth', label: 'Este mês' },
  { value: 'around', label: 'Últimos 12 + próximos 12 meses' },
  { value: 'next3', label: 'Próximos 3 meses' },
  { value: 'next6', label: 'Próximos 6 meses' },
  { value: 'next12', label: 'Próximos 12 meses' },
  { value: 'last12', label: 'Últimos 12 meses' },
  { value: 'thisYear', label: 'Este ano' },
  { value: 'nextYear', label: 'Próximo ano' },
  { value: 'custom', label: 'Personalizado' },
];

/** Linha dos filtros. */
const FILTERS_CLASS = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end';

/** Caixa dos gráficos. */
const CHART_CARD_CLASS = 'p-4 md:p-5';

/**
 * Esqueleto da previsão — usado pelo `loading.tsx` e enquanto os dados carregam.
 *
 * @returns Página em esqueleto
 */
export function ForecastPageSkeleton() {
  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeaderSkeleton title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} />
      <div className={FILTERS_CLASS} aria-hidden>
        <FieldSkeleton labelWidth={40} />
        <FieldSkeleton labelWidth={56} />
      </div>
      <ForecastKpisSkeleton />
      <div>
        <SectionHeaderSkeleton title='Patrimônio mês a mês' />
        <Card className={CHART_CARD_CLASS}>
          <NetWorthChartSkeleton />
        </Card>
      </div>
      <div>
        <SectionHeaderSkeleton title='Sobra de cada mês' />
        <Card className={CHART_CARD_CLASS}>
          <ResultBarsSkeleton />
        </Card>
      </div>
      <div>
        <SectionHeaderSkeleton title='Contratos e lançamentos por mês' />
        <ForecastTableSkeleton />
      </div>
    </div>
  );
}

/**
 * Tela de previsão: filtros, KPIs, patrimônio, sobra mensal e tabela.
 * Bens físicos só entram com o selo "Incluir bens", desligado ao abrir.
 *
 * @returns Tela de previsão
 */
export function ForecastView() {
  const current = todayIso().slice(0, 7);
  const ledgers = useLedgers();
  const [ledgerId, setLedgerId] = useState('');
  const [preset, setPreset] = useState<PeriodPreset>('thisMonth');
  const [custom, setCustom] = useState<MonthRange>(() => periodRange('next12', current));
  const [includeAssets, setIncludeAssets] = useState(false);
  const [selected, setSelected] = useState<string | undefined>();
  const range = periodRange(preset, current, custom);
  const clamped = preset === 'custom' && range.to < (custom.from <= custom.to ? custom.to : custom.from);
  const forecast = useForecast({ ...range, ...(ledgerId ? { ledgerId } : {}) });

  if (forecast.isPending) return <ForecastPageSkeleton />;

  const data = forecast.data;
  const select = (month: string) => setSelected(month.length === 7 ? `${month}-01` : month);

  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeader title={PAGE_TITLE} subtitle={PAGE_SUBTITLE} />
      <div className={FILTERS_CLASS}>
        <Select label='Livro' options={[{ value: '', label: 'Todos os livros' }, ...ledgerOptions(ledgers.data ?? [])]} value={ledgerId} onChange={event => setLedgerId(event.target.value)} />
        <Select label='Período' options={PRESET_OPTIONS} value={preset} onChange={event => setPreset(event.target.value as PeriodPreset)} />
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
        <div className='flex items-end pb-2.5'>
          <ToggleBadge pressed={includeAssets} onPressedChange={setIncludeAssets}>
            {INCLUDE_ASSETS_LABEL}
          </ToggleBadge>
        </div>
      </div>
      {forecast.isError || !data ? (
        <ErrorState message={forecast.error?.message ?? 'Não foi possível carregar a previsão.'} onRetry={() => void forecast.refetch()} />
      ) : (
        <ForecastBody data={data} includeAssets={includeAssets} selected={selected} onSelect={select} />
      )}
    </div>
  );
}

/**
 * Corpo da previsão: KPIs, gráficos e tabela.
 *
 * @param props - Previsão, selo de bens, mês selecionado e callback
 * @returns Seções da tela
 */
function ForecastBody({ data, includeAssets, selected, onSelect: select }: { data: Forecast; includeAssets: boolean; selected?: string; onSelect: (month: string) => void }) {
  const kpis = forecastKpis(data, { selectedMonth: selected, includeAssets });
  const recurring = recurringAverages(data);
  const router = useRouter();
  const recurrences = useRecurrences();
  const [openRecurrenceId, setOpenRecurrenceId] = useState<string | null>(null);
  const openRecurrence = recurrences.data?.find(item => item.recurrenceId === openRecurrenceId);
  return (
    <>
      <ForecastKpis kpis={kpis} recurringIncomeCents={recurring.incomeCents} recurringExpenseCents={recurring.expenseCents} />
      <div>
        <SectionHeader title='Patrimônio mês a mês' subtitle='Linha cheia: o que aconteceu. Tracejada: o que vem pela frente. Clique num mês para vê-lo nos KPIs.' />
        <Card className={CHART_CARD_CLASS}>
          <NetWorthChart
            data={data.months.map(item => ({ month: item.month.slice(0, 7), netWorthCents: monthNetWorth(item, includeAssets), realized: item.realized }))}
            currentMonth={data.currentMonth.slice(0, 7)}
            onSelect={select}
          />
        </Card>
      </div>
      <div>
        <SectionHeader title='Sobra de cada mês' subtitle='Barra para baixo é mês no prejuízo.' />
        <Card className={CHART_CARD_CLASS}>
          <ResultBars
            data={data.months.map(item => ({ month: item.month.slice(0, 7), incomeCents: item.incomeCents, expenseCents: item.expenseCents, resultCents: item.resultCents, realized: item.realized }))}
            selected={kpis.selected?.month.slice(0, 7)}
            onSelect={select}
          />
        </Card>
      </div>
      <div>
        <SectionHeader title='Contratos e lançamentos por mês' subtitle='✓ já pago · em itálico: projeção do recorrente · clique num contrato para editá-lo, num mês para vê-lo nos KPIs.' />
        <ForecastTable
          forecast={data}
          includeAssets={includeAssets}
          selected={kpis.selected?.month}
          onSelect={select}
          onOpenRecurrence={setOpenRecurrenceId}
          onOpenOthers={() => router.push('/lancamentos')}
        />
        <RecurrenceSheet open={!!openRecurrence} onOpenChange={open => !open && setOpenRecurrenceId(null)} recurrence={openRecurrence} />
      </div>
    </>
  );
}
