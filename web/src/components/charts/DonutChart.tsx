/**
 * Rosca com legenda em lista (nome, valor e participação).
 *
 * @module components/charts/DonutChart
 */
'use client';

import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/Skeleton';
import { SkeletonText } from '@/components/ui/SkeletonKit';
import { cn } from '@/lib/cn';
import { formatMoney, formatPercent } from '@/lib/format';

/** Fatia da rosca. */
export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  /** Cor CSS (`var(--chart-1)`, `var(--color-palette-green)`...). */
  color: string;
}

/** Ordem categórica fixa dos gráficos (ver `globals.css`). */
export const CHART_SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)'];

/** Rosca ao lado da legenda (embaixo no celular). */
const LAYOUT_CLASS = 'flex flex-col items-center gap-6 sm:flex-row sm:items-center';

/** Caixa da rosca, com tamanho fixo — o esqueleto usa a mesma. */
const PLOT_CLASS = 'relative size-[176px] shrink-0';

/** Texto no centro da rosca. */
const CENTER_CLASS = 'pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center';

/** Rótulo do centro (o nome da fatia em foco ou o do total). */
const CENTER_LABEL_CLASS = 'max-w-[110px] truncate text-caption text-fg-muted';

/** Valor do centro. */
const CENTER_VALUE_CLASS = 'tabular text-headline font-bold tracking-[-0.02em]';

/** Lista da legenda. */
const LEGEND_CLASS = 'w-full min-w-0 flex-1 space-y-0.5';

/** Linha da legenda. */
const LEGEND_ROW_CLASS = 'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-footnote';

/** Forma do ponto de cor da legenda. */
const LEGEND_DOT_CLASS = 'size-2.5 shrink-0 rounded-full';

/** Nome da fatia na legenda. */
const LEGEND_LABEL_CLASS = 'min-w-0 flex-1 truncate';

/** Participação da fatia na legenda. */
const LEGEND_SHARE_CLASS = 'tabular text-fg-muted';

/** Valor da fatia na legenda. */
const LEGEND_VALUE_CLASS = 'tabular w-[92px] text-right font-medium';

/** Larguras típicas dos nomes na legenda do esqueleto. */
const SKELETON_LABEL_WIDTHS = ['62%', '48%', '70%', '40%', '55%', '45%', '58%'] as const;

/**
 * Rosca fina com 2 px de espaço entre fatias e total no centro. Passar o
 * mouse numa linha da legenda (ou numa fatia) destaca a fatia. A legenda
 * em lista com valores é também a versão em texto do gráfico.
 *
 * @example
 * <DonutChart slices={slices} centerLabel='Despesas' />
 */
export function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const focus = slices.find(slice => slice.key === hovered);

  return (
    <div className={LAYOUT_CLASS}>
      <div className={PLOT_CLASS} role='img' aria-label={`${centerLabel}: ${formatMoney(total)}`}>
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart>
            <Pie
              data={slices}
              dataKey='value'
              nameKey='label'
              innerRadius='72%'
              outerRadius='100%'
              paddingAngle={slices.length > 1 ? 1.5 : 0}
              cornerRadius={4}
              stroke='var(--color-surface)'
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              animationDuration={700}
              onMouseEnter={(_, index) => setHovered(slices[index]?.key ?? null)}
              onMouseLeave={() => setHovered(null)}
            >
              {slices.map(slice => (
                <Cell key={slice.key} fill={slice.color} opacity={hovered && hovered !== slice.key ? 0.35 : 1} style={{ transition: 'opacity 200ms' }} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className={CENTER_CLASS}>
          <span className={CENTER_LABEL_CLASS}>{focus ? focus.label : centerLabel}</span>
          <span className={CENTER_VALUE_CLASS}>{formatMoney(focus ? focus.value : total, { compact: (focus ? focus.value : total) >= 10_000_000 })}</span>
        </div>
      </div>
      <ul className={LEGEND_CLASS}>
        {slices.map(slice => (
          <li key={slice.key}>
            <div
              onMouseEnter={() => setHovered(slice.key)}
              onMouseLeave={() => setHovered(null)}
              className={cn(LEGEND_ROW_CLASS, 'transition-opacity', hovered && hovered !== slice.key && 'opacity-50')}
            >
              <span className={LEGEND_DOT_CLASS} style={{ background: slice.color }} />
              <span className={LEGEND_LABEL_CLASS}>{slice.label}</span>
              <span className={LEGEND_SHARE_CLASS}>{total ? formatPercent(slice.value / total) : '0%'}</span>
              <span className={LEGEND_VALUE_CLASS}>{formatMoney(slice.value)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Esqueleto da rosca: a mesma caixa de 176 px com um anel no lugar das
 * fatias (furo de 72%, como o `innerRadius`), o rótulo real no centro e as
 * linhas da legenda com nome, participação e valor.
 *
 * @param props - Rótulo do centro (o mesmo do `DonutChart`) e linhas da legenda
 * @returns Rosca em esqueleto
 *
 * @example
 * <DonutChartSkeleton centerLabel='Despesas' rows={5} />
 */
export function DonutChartSkeleton({ centerLabel, rows = 5 }: { centerLabel: string; rows?: number }) {
  return (
    <div className={LAYOUT_CLASS} aria-hidden>
      <div className={PLOT_CLASS}>
        <Skeleton className='size-full rounded-full' />
        <div className='absolute inset-[14%] rounded-full bg-surface' />
        <div className={CENTER_CLASS}>
          <SkeletonText className={cn('w-auto', CENTER_LABEL_CLASS)} text={centerLabel} align='center' />
          <SkeletonText className={cn('w-auto', CENTER_VALUE_CLASS)} width={88} align='center' />
        </div>
      </div>
      <ul className={LEGEND_CLASS}>
        {Array.from({ length: rows }, (_, index) => (
          <li key={index}>
            <div className={LEGEND_ROW_CLASS}>
              <Skeleton className={LEGEND_DOT_CLASS} />
              <SkeletonText className={LEGEND_LABEL_CLASS} width={SKELETON_LABEL_WIDTHS[index % SKELETON_LABEL_WIDTHS.length]} />
              <SkeletonText className={cn('w-auto', LEGEND_SHARE_CLASS)} width='2.5em' />
              <SkeletonText className={LEGEND_VALUE_CLASS} width='75%' align='end' />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
