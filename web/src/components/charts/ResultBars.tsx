/**
 * Barras da sobra de cada mês: para cima quando sobra, para baixo no prejuízo.
 *
 * @module components/charts/ResultBars
 */
'use client';

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { SkeletonText } from '@/components/ui/SkeletonKit';
import { formatMoney, formatMonthLong, formatMonthShort } from '@/lib/format';

/** Ponto do gráfico: mês (`YYYY-MM`) e o que sobrou (ou faltou). */
export interface ResultPoint {
  month: string;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
  realized: boolean;
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

/** Área do gráfico. */
const PLOT_CLASS = 'h-[200px]';

/** Altura do esqueleto, igual à do gráfico. */
const SKELETON_PLOT_CLASS = 'h-[200px] w-full rounded-xl';

/**
 * Tooltip do mês: entra, sai e sobra.
 *
 * @param props - Estado do tooltip do Recharts
 * @returns Caixa do tooltip, ou nada
 */
function ResultTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const point = payload?.[0]?.payload as ResultPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className='material min-w-[180px] rounded-lg bg-elevated/90 px-3.5 py-2.5 text-footnote shadow-float'>
      <p className='mb-1.5 font-semibold'>
        {formatMonthLong(point.month)} <span className='font-normal text-fg-muted'>· {point.realized ? 'realizado' : 'previsto'}</span>
      </p>
      <p className='flex justify-between gap-4 text-fg-muted'>
        Entra <span className='tabular text-fg'>{formatMoney(point.incomeCents)}</span>
      </p>
      <p className='flex justify-between gap-4 text-fg-muted'>
        Sai <span className='tabular text-fg'>{formatMoney(point.expenseCents)}</span>
      </p>
      <p className='mt-1.5 flex justify-between gap-4 border-t border-border pt-1.5 font-semibold'>
        {point.resultCents >= 0 ? 'Sobra' : 'Falta'}
        <span className={`tabular ${point.resultCents >= 0 ? 'text-success' : 'text-error'}`}>{formatMoney(point.resultCents, { signed: true })}</span>
      </p>
    </div>
  );
}

/**
 * Barras da sobra mensal. O mês selecionado fica em destaque; os outros,
 * mais claros. Clicar numa barra seleciona o mês.
 *
 * @param props - Pontos, mês selecionado e callback
 * @returns Gráfico com legenda
 *
 * @example
 * <ResultBars data={points} selected='2027-03' onSelect={setSelected} />
 */
export function ResultBars({ data, selected, onSelect }: { data: ResultPoint[]; selected?: string; onSelect?: (month: string) => void }) {
  return (
    <div>
      <div className={LEGEND_CLASS} aria-hidden>
        <span className='flex items-center gap-1.5'>
          <span className='size-2.5 rounded-xs bg-[var(--chart-income)]' /> Sobra
        </span>
        <span className='flex items-center gap-1.5'>
          <span className='size-2.5 rounded-xs bg-[var(--chart-expense)]' /> Falta (prejuízo)
        </span>
      </div>
      <div className={PLOT_CLASS} role='img' aria-label='Quanto sobra ou falta em cada mês'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
            barCategoryGap='24%'
            onClick={state => {
              const label = (state as { activeLabel?: string | number } | null)?.activeLabel;
              if (label !== undefined) onSelect?.(String(label));
            }}
          >
            <CartesianGrid vertical={false} stroke='var(--chart-grid)' />
            <XAxis dataKey='month' tickFormatter={monthTick} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-fg-muted)', fontSize: 12 }} dy={6} minTickGap={12} />
            <YAxis tickFormatter={value => formatMoney(Number(value), { compact: true })} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-fg-subtle)', fontSize: 11 }} width={64} />
            <ReferenceLine y={0} stroke='var(--color-border-strong)' />
            <Tooltip content={props => <ResultTooltip active={props.active} payload={props.payload} />} cursor={{ fill: 'var(--color-fill-2)', radius: 8 }} />
            <Bar dataKey='resultCents' radius={[4, 4, 4, 4]} maxBarSize={22} animationDuration={700} className='cursor-pointer'>
              {data.map(point => (
                <Cell
                  key={point.month}
                  fill={point.resultCents >= 0 ? 'var(--chart-income)' : 'var(--chart-expense)'}
                  fillOpacity={!selected || selected === point.month ? 1 : point.realized ? 0.35 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Esqueleto das barras de sobra: legenda e área do mesmo tamanho.
 *
 * @returns Gráfico em esqueleto
 */
export function ResultBarsSkeleton() {
  return (
    <div aria-hidden>
      <div className={LEGEND_CLASS}>
        <SkeletonText className='w-auto' text='Sobra' />
        <SkeletonText className='w-auto' text='Falta (prejuízo)' />
      </div>
      <Skeleton className={SKELETON_PLOT_CLASS} />
    </div>
  );
}
