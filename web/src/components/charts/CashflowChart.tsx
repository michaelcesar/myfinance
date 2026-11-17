/**
 * Gráfico de barras de receita × despesa nos últimos 12 meses.
 *
 * @module components/charts/CashflowChart
 */
'use client';

import type { CSSProperties } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { SkeletonText } from '@/components/ui/SkeletonKit';
import { cn } from '@/lib/cn';
import { formatMoney, formatMonthLong, formatMonthShort } from '@/lib/format';

/** Ponto mensal. */
export interface CashflowPoint {
  month: string;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
}

/**
 * Dica flutuante no estilo de menu translúcido.
 *
 * @param props - `active` e `payload` do tooltip do Recharts
 * @returns Cartão com receita, despesa e resultado do mês
 */
function CashflowTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const point = payload?.[0]?.payload as CashflowPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className='material min-w-[180px] rounded-lg bg-elevated/90 px-3.5 py-2.5 text-footnote shadow-float'>
      <p className='mb-1.5 font-semibold'>{formatMonthLong(point.month)}</p>
      <p className='flex items-center justify-between gap-4 text-fg-muted'>
        <span className='flex items-center gap-1.5'>
          <span className='size-2 rounded-full bg-[var(--chart-income)]' /> Receitas
        </span>
        <span className='tabular text-fg'>{formatMoney(point.incomeCents)}</span>
      </p>
      <p className='flex items-center justify-between gap-4 text-fg-muted'>
        <span className='flex items-center gap-1.5'>
          <span className='size-2 rounded-full bg-[var(--chart-expense)]' /> Despesas
        </span>
        <span className='tabular text-fg'>{formatMoney(point.expenseCents)}</span>
      </p>
      <p className='mt-1.5 flex justify-between gap-4 border-t border-border pt-1.5 font-semibold'>
        Resultado <span className={`tabular ${point.resultCents >= 0 ? 'text-success' : 'text-error'}`}>{formatMoney(point.resultCents, { signed: true })}</span>
      </p>
    </div>
  );
}

/** Legenda acima do gráfico. */
const LEGEND_CLASS = 'mb-3 flex items-center gap-4 px-1 text-caption text-fg-muted';

/** Item da legenda (amostra + rótulo). */
const LEGEND_ITEM_CLASS = 'flex items-center gap-1.5';

/** Forma da amostra de cor da legenda. */
const LEGEND_SWATCH_CLASS = 'size-2.5 rounded-xs';

/** Séries do gráfico, na ordem da legenda. */
const SERIES = [
  { label: 'Receitas', swatch: 'bg-[var(--chart-income)]' },
  { label: 'Despesas', swatch: 'bg-[var(--chart-expense)]' },
] as const;

/** Caixa do gráfico, com altura fixa — o esqueleto usa a mesma. */
const PLOT_CLASS = 'h-[240px]';

/** Alturas típicas (receita, despesa) dos 12 meses no esqueleto, em % da área. */
const SKELETON_BARS = [
  [62, 48],
  [70, 55],
  [58, 60],
  [75, 52],
  [66, 58],
  [80, 62],
  [72, 50],
  [68, 64],
  [84, 57],
  [76, 61],
  [70, 54],
  [88, 66],
] as const;

/** Área das barras no esqueleto: descontados o eixo Y (64 px + margem) e os rótulos dos meses. */
const SKELETON_AREA_CLASS = 'flex h-full items-end justify-around pt-1 pr-1 pb-7.5 pl-17';

/** Barra do esqueleto, com a altura em `--sk-h`. */
const SKELETON_BAR_CLASS = 'h-(--sk-h) w-2 rounded-xs sm:w-3';

/**
 * Barras finas lado a lado, com cantos arredondados no topo, grade
 * discreta e uma única escala no eixo Y.
 *
 * @example
 * <CashflowChart data={summary.monthly} />
 */
export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  return (
    <div>
      <div className={LEGEND_CLASS} aria-hidden>
        {SERIES.map(series => (
          <span key={series.label} className={LEGEND_ITEM_CLASS}>
            <span className={cn(LEGEND_SWATCH_CLASS, series.swatch)} /> {series.label}
          </span>
        ))}
      </div>
      <div className={PLOT_CLASS} role='img' aria-label='Receitas e despesas dos últimos 12 meses'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={data} barGap={2} barCategoryGap='28%' margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke='var(--chart-grid)' />
            <XAxis dataKey='month' tickFormatter={formatMonthShort} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-fg-muted)', fontSize: 12 }} dy={6} />
            <YAxis tickFormatter={value => formatMoney(Number(value), { compact: true })} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-fg-subtle)', fontSize: 11 }} width={64} />
            <Tooltip content={props => <CashflowTooltip active={props.active} payload={props.payload} />} cursor={{ fill: 'var(--color-fill-2)', radius: 8 }} />
            <Bar dataKey='incomeCents' name='Receitas' fill='var(--chart-income)' radius={[4, 4, 0, 0]} maxBarSize={18} animationDuration={700} animationEasing='ease-out' />
            <Bar dataKey='expenseCents' name='Despesas' fill='var(--chart-expense)' radius={[4, 4, 0, 0]} maxBarSize={18} animationDuration={700} animationEasing='ease-out' />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Esqueleto do gráfico de fluxo de caixa: a mesma legenda (rótulos reais) e a
 * mesma caixa de 240 px, com 12 pares de barras no lugar dos meses. O recuo
 * à esquerda e embaixo é o do eixo Y (64 px) e o dos rótulos dos meses.
 *
 * @returns Gráfico em esqueleto
 *
 * @example
 * <CashflowChartSkeleton />
 */
export function CashflowChartSkeleton() {
  return (
    <div aria-hidden>
      <div className={LEGEND_CLASS}>
        {SERIES.map(series => (
          <span key={series.label} className={LEGEND_ITEM_CLASS}>
            <Skeleton className={LEGEND_SWATCH_CLASS} />
            <SkeletonText className='w-auto' text={series.label} />
          </span>
        ))}
      </div>
      <div className={PLOT_CLASS}>
        <div className={SKELETON_AREA_CLASS}>
          {SKELETON_BARS.map(([income, expense], index) => (
            <div key={index} className='flex h-full items-end gap-0.5'>
              <Skeleton className={SKELETON_BAR_CLASS} style={{ '--sk-h': `${income}%` } as CSSProperties} />
              <Skeleton className={SKELETON_BAR_CLASS} style={{ '--sk-h': `${expense}%` } as CSSProperties} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
