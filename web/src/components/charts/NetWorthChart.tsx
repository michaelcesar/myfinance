/**
 * Linha do patrimônio mês a mês: sólida no realizado, tracejada no previsto.
 *
 * @module components/charts/NetWorthChart
 */
'use client';

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { SkeletonText } from '@/components/ui/SkeletonKit';
import { cn } from '@/lib/cn';
import { formatMoney, formatMonthLong, formatMonthShort } from '@/lib/format';

/** Ponto do gráfico: mês (`YYYY-MM`) e patrimônio no fim dele. */
export interface NetWorthPoint {
  month: string;
  netWorthCents: number;
  realized: boolean;
}

/** Ponto com as duas séries: o mês atual entra nas duas para a linha não quebrar. */
interface PlotPoint extends NetWorthPoint {
  realizedCents: number | null;
  forecastCents: number | null;
}

/**
 * Mês curto com ano no eixo: "dez/26".
 *
 * @param month - Mês `YYYY-MM`
 * @returns Rótulo do eixo
 */
function monthTick(month: string): string {
  return `${formatMonthShort(month)}/${month.slice(2, 4)}`;
}

/** Legenda acima do gráfico. */
const LEGEND_CLASS = 'mb-3 flex flex-wrap items-center gap-4 px-1 text-caption text-fg-muted';

/** Item da legenda. */
const LEGEND_ITEM_CLASS = 'flex items-center gap-1.5';

/** Área do gráfico. */
const PLOT_CLASS = 'h-[260px]';

/** Altura do esqueleto, igual à do gráfico. */
const SKELETON_PLOT_CLASS = 'h-[260px] w-full rounded-xl';

/**
 * Tooltip do mês: patrimônio no fim e se é realizado ou previsto.
 *
 * @param props - Estado do tooltip do Recharts
 * @returns Caixa do tooltip, ou nada
 */
function NetWorthTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const point = payload?.[0]?.payload as PlotPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className='material min-w-[180px] rounded-lg bg-elevated/90 px-3.5 py-2.5 text-footnote shadow-float'>
      <p className='mb-1 font-semibold'>{formatMonthLong(point.month)}</p>
      <p className='flex items-center justify-between gap-4 text-fg-muted'>
        {point.realized ? 'Patrimônio (realizado)' : 'Patrimônio (previsto)'}
        <span className='tabular text-fg'>{formatMoney(point.netWorthCents)}</span>
      </p>
    </div>
  );
}

/**
 * Linha do patrimônio com a marca de "hoje". Clicar num mês o seleciona.
 *
 * @param props - Pontos, mês atual (`YYYY-MM`) e seleção
 * @returns Gráfico com legenda
 *
 * @example
 * <NetWorthChart data={points} currentMonth='2026-11' onSelect={setSelected} />
 */
export function NetWorthChart({ data, currentMonth, onSelect }: { data: NetWorthPoint[]; currentMonth: string; onSelect?: (month: string) => void }) {
  const points: PlotPoint[] = data.map(point => ({
    ...point,
    realizedCents: point.realized || point.month === currentMonth ? point.netWorthCents : null,
    forecastCents: point.realized ? null : point.netWorthCents,
  }));
  const hasRealized = points.some(point => point.realized);
  const hasForecast = points.some(point => !point.realized);
  return (
    <div>
      <div className={LEGEND_CLASS} aria-hidden>
        {hasRealized && (
          <span className={LEGEND_ITEM_CLASS}>
            <span className='h-0.5 w-4 rounded-full bg-[var(--chart-1)]' /> Realizado
          </span>
        )}
        {hasForecast && (
          <span className={LEGEND_ITEM_CLASS}>
            <span className='h-0 w-4 border-t-2 border-dashed border-[var(--chart-1)]' /> Previsto
          </span>
        )}
      </div>
      <div className={PLOT_CLASS} role='img' aria-label='Patrimônio no fim de cada mês, realizado e previsto'>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart
            data={points}
            margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
            onClick={state => {
              const label = (state as { activeLabel?: string | number } | null)?.activeLabel;
              if (label !== undefined) onSelect?.(String(label));
            }}
          >
            <CartesianGrid vertical={false} stroke='var(--chart-grid)' />
            <XAxis dataKey='month' tickFormatter={monthTick} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-fg-muted)', fontSize: 12 }} dy={6} minTickGap={12} />
            <YAxis tickFormatter={value => formatMoney(Number(value), { compact: true })} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-fg-subtle)', fontSize: 11 }} width={64} />
            <Tooltip content={props => <NetWorthTooltip active={props.active} payload={props.payload} />} cursor={{ stroke: 'var(--color-border-strong)' }} />
            {points.some(point => point.month === currentMonth) && (
              <ReferenceLine
                x={currentMonth}
                stroke='var(--color-border-strong)'
                strokeDasharray='2 4'
                label={{ value: 'Hoje', position: 'insideTopRight', fill: 'var(--color-fg-muted)', fontSize: 11 }}
              />
            )}
            <Line type='monotone' dataKey='realizedCents' stroke='var(--chart-1)' strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} animationDuration={700} />
            <Line type='monotone' dataKey='forecastCents' stroke='var(--chart-1)' strokeWidth={2} strokeDasharray='6 5' dot={false} activeDot={{ r: 4 }} connectNulls={false} animationDuration={700} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Esqueleto do gráfico de patrimônio: legenda e área do mesmo tamanho.
 *
 * @returns Gráfico em esqueleto
 */
export function NetWorthChartSkeleton() {
  return (
    <div aria-hidden>
      <div className={LEGEND_CLASS}>
        <SkeletonText className='w-auto' text='Realizado' />
        <SkeletonText className='w-auto' text='Previsto' />
      </div>
      <Skeleton className={cn(SKELETON_PLOT_CLASS)} />
    </div>
  );
}
