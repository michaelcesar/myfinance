/**
 * Blocos dos painéis: cartão de patrimônio, indicadores do período,
 * receitas por origem, despesas por categoria e pendências.
 *
 * Cada bloco exporta o próprio esqueleto (`NetWorthCardSkeleton`,
 * `PeriodStatsSkeleton`…) no mesmo arquivo: mesma caixa, conteúdo trocado.
 *
 * @module components/finance/SummaryBlocks
 */
'use client';

import { ArrowDownLeft, ArrowUpRight, CalendarClock, type LucideIcon, PieChart as PieIcon, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { type CSSProperties, type ReactNode, useState } from 'react';
import { CashflowChart, CashflowChartSkeleton, type CashflowPoint } from '@/components/charts/CashflowChart';
import { CHART_SERIES, DonutChart, DonutChartSkeleton } from '@/components/charts/DonutChart';
import { Card, SectionHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import { SectionHeaderSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { ToggleBadge } from '@/components/ui/ToggleBadge';
import { cn } from '@/lib/cn';
import { formatDay } from '@/lib/format';
import { INVESTMENT_TYPE_LABELS } from '@/lib/labels';
import { visibleNetWorth } from '@/lib/net-worth';
import { palette } from '@/lib/palette';
import type { Summary } from '@/types/entities';

/** Grade dos blocos de detalhe (origem, categoria, pendências, carteira) — a tela e o esqueleto usam a mesma. */
export const SUMMARY_GRID_CLASS = 'grid grid-cols-1 gap-4 xl:grid-cols-2';

/** Moldura interna dos cartões de detalhe. */
const BLOCK_CARD_CLASS = 'h-full p-5';

/**
 * Entrada em cascata dos blocos de um painel.
 *
 * @param props - Atraso (índice) e conteúdo
 * @returns Bloco animado
 */
export function Reveal({ index = 0, children, className }: { index?: number; children: ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.05, ease: [0.32, 0.72, 0, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

/** Cartão do patrimônio. */
const NET_WORTH_CARD_CLASS = 'relative overflow-hidden p-6 md:p-7';

/** Rótulo do destaque. */
const NET_WORTH_TITLE_CLASS = 'text-subhead font-medium text-fg-muted';

/** Valor do patrimônio. */
const NET_WORTH_VALUE_CLASS = 'mt-1 block font-display text-display-lg leading-tight font-bold tracking-[-0.035em] md:text-display-xl';

/** Texto do selo que soma os bens físicos ao patrimônio. */
export const INCLUDE_ASSETS_LABEL = 'Incluir bens';

/** Faixa de caixa e investimentos. */
const NET_WORTH_PARTS_CLASS = 'mt-5 flex flex-wrap gap-x-8 gap-y-3';

/** Rótulo de cada parte. */
const NET_WORTH_PART_LABEL_CLASS = 'text-caption text-fg-muted';

/** Valor de cada parte. */
const NET_WORTH_PART_VALUE_CLASS = 'text-headline font-semibold';

/**
 * Cartão principal: patrimônio em destaque, com caixa e investimentos. Bens
 * físicos só entram com o selo "Incluir bens", desligado sempre que a tela abre.
 *
 * @param props - Resumo e rótulo do destaque
 * @returns Cartão com gradiente sutil
 */
export function NetWorthCard({ summary, title = 'Patrimônio' }: { summary: Summary; title?: string }) {
  const [includeAssets, setIncludeAssets] = useState(false);
  return (
    <Card className={NET_WORTH_CARD_CLASS}>
      <div className='flex items-center justify-between gap-3'>
        <p className={NET_WORTH_TITLE_CLASS}>{title}</p>
        <ToggleBadge pressed={includeAssets} onPressedChange={setIncludeAssets}>
          {INCLUDE_ASSETS_LABEL}
        </ToggleBadge>
      </div>
      <Money cents={visibleNetWorth(summary, includeAssets)} animated className={NET_WORTH_VALUE_CLASS} />
      <div className={NET_WORTH_PARTS_CLASS}>
        <div>
          <p className={NET_WORTH_PART_LABEL_CLASS}>Em contas</p>
          <Money cents={summary.cashCents} animated className={NET_WORTH_PART_VALUE_CLASS} />
        </div>
        <div>
          <p className={NET_WORTH_PART_LABEL_CLASS}>Investido</p>
          <Money cents={summary.investmentsCents} animated className={NET_WORTH_PART_VALUE_CLASS} />
        </div>
        {includeAssets && (
          <div>
            <p className={NET_WORTH_PART_LABEL_CLASS}>Bens</p>
            <Money cents={summary.assetsCents} animated className={NET_WORTH_PART_VALUE_CLASS} />
          </div>
        )}
        {(summary.totals.pendingIncomeCents > 0 || summary.totals.pendingExpenseCents > 0) && (
          <div>
            <p className={NET_WORTH_PART_LABEL_CLASS}>Previsto no período</p>
            <Money cents={summary.totals.pendingIncomeCents - summary.totals.pendingExpenseCents} signed animated className={cn(NET_WORTH_PART_VALUE_CLASS, 'text-fg-muted')} />
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Esqueleto do cartão de patrimônio: mesmo cartão, rótulo real, valor e as
 * duas partes (em contas, investido).
 *
 * @param props - Rótulo do destaque (o mesmo do `NetWorthCard`)
 * @returns Cartão em esqueleto
 */
export function NetWorthCardSkeleton({ title = 'Patrimônio' }: { title?: string }) {
  return (
    <Card className={NET_WORTH_CARD_CLASS} aria-hidden>
      <SkeletonText className={NET_WORTH_TITLE_CLASS} text={title} />
      <SkeletonText className={NET_WORTH_VALUE_CLASS} width='min(100%, 260px)' />
      <div className={NET_WORTH_PARTS_CLASS}>
        {['Em contas', 'Investido'].map(label => (
          <div key={label}>
            <SkeletonText className={NET_WORTH_PART_LABEL_CLASS} text={label} />
            <SkeletonText className={NET_WORTH_PART_VALUE_CLASS} width={104} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Indicador do período, sem o valor. */
interface StatDefinition {
  label: string;
  icon: LucideIcon;
  pick: (totals: Summary['totals']) => number;
  signed?: boolean;
  hint?: string;
}

/**
 * Indicadores da grade: receitas, despesas, resultado e, num livro, o que
 * entrou ou saiu de outros livros. A tela e o esqueleto usam a mesma lista.
 *
 * @param ledgerType - Tipo do livro, quando é a visão de um livro
 * @returns Indicadores na ordem da grade
 */
function statDefinitions(ledgerType?: 'PERSONAL' | 'COMPANY'): StatDefinition[] {
  const stats: StatDefinition[] = [
    { label: 'Receitas', icon: TrendingUp, pick: totals => totals.incomeCents },
    { label: 'Despesas', icon: TrendingDown, pick: totals => totals.expenseCents },
    { label: 'Resultado', icon: Sparkles, pick: totals => totals.resultCents, signed: true },
  ];
  if (ledgerType === 'PERSONAL') stats.push({ label: 'Recebido das empresas', icon: ArrowDownLeft, pick: totals => totals.transfersInCents, hint: 'Pró-labore e lucros.' });
  if (ledgerType === 'COMPANY') stats.push({ label: 'Retiradas', icon: ArrowUpRight, pick: totals => totals.transfersOutCents, hint: 'Para outros livros.' });
  return stats;
}

/**
 * Grade dos indicadores: 3 colunas (a última ocupa a linha no celular) ou 4.
 *
 * @param count - Quantidade de indicadores
 * @returns Classes da grade
 */
function statsGridClass(count: number): string {
  return cn('grid grid-cols-2 gap-3', count === 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3');
}

/**
 * Célula de um indicador na grade.
 *
 * @param count - Quantidade de indicadores
 * @param index - Posição do indicador
 * @returns Classes da célula
 */
function statCellClass(count: number, index: number): string | undefined {
  return count === 3 && index === 2 ? 'col-span-2 lg:col-span-1' : undefined;
}

/** Cartão de cada indicador. */
const STAT_CARD_CLASS = 'h-full p-4 md:p-5';

/** Linha do ícone e do rótulo. */
const STAT_HEADER_CLASS = 'flex items-center gap-2';

/** Forma do círculo do ícone. */
const STAT_ICON_SHAPE_CLASS = 'size-6 rounded-full';

/** Rótulo do indicador. */
const STAT_LABEL_CLASS = 'text-footnote font-medium text-fg-muted';

/** Valor do indicador. */
const STAT_VALUE_CLASS = 'mt-2 block truncate font-display text-title-3 font-bold tracking-[-0.02em] sm:text-title-1';

/** Dica embaixo do valor. */
const STAT_HINT_CLASS = 'mt-0.5 text-caption text-fg-subtle';

/**
 * Grade de indicadores: receitas, despesas, resultado e, num livro, o que
 * entrou e saiu de outros livros.
 *
 * @param props - Resumo e se é a visão de um livro
 * @returns Grade de cartões
 */
export function PeriodStats({ summary, ledgerType }: { summary: Summary; ledgerType?: 'PERSONAL' | 'COMPANY' }) {
  const stats = statDefinitions(ledgerType);
  return (
    <div className={statsGridClass(stats.length)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Reveal key={stat.label} index={index + 1} className={statCellClass(stats.length, index)}>
            <Card className={STAT_CARD_CLASS}>
              <div className={STAT_HEADER_CLASS}>
                <span className={cn('flex items-center justify-center bg-fill-2 text-fg-muted', STAT_ICON_SHAPE_CLASS)}>
                  <Icon className='size-3.5' strokeWidth={2.5} />
                </span>
                <p className={STAT_LABEL_CLASS}>{stat.label}</p>
              </div>
              <Money cents={stat.pick(summary.totals)} signed={stat.signed} animated className={STAT_VALUE_CLASS} />
              {stat.hint && <p className={STAT_HINT_CLASS}>{stat.hint}</p>}
            </Card>
          </Reveal>
        );
      })}
    </div>
  );
}

/**
 * Esqueleto da grade de indicadores: a mesma grade e os mesmos cartões (3 na
 * visão geral, 4 num livro), com rótulos e dicas reais e o valor em barra.
 *
 * @param props - Tipo do livro (o mesmo do `PeriodStats`)
 * @returns Grade em esqueleto
 */
export function PeriodStatsSkeleton({ ledgerType }: { ledgerType?: 'PERSONAL' | 'COMPANY' }) {
  const stats = statDefinitions(ledgerType);
  return (
    <div className={statsGridClass(stats.length)} aria-hidden>
      {stats.map((stat, index) => (
        <div key={stat.label} className={statCellClass(stats.length, index)}>
          <Card className={STAT_CARD_CLASS}>
            <div className={STAT_HEADER_CLASS}>
              <Skeleton className={cn('shrink-0', STAT_ICON_SHAPE_CLASS)} />
              <SkeletonText className={STAT_LABEL_CLASS} text={stat.label} />
            </div>
            <SkeletonText className={STAT_VALUE_CLASS} width='70%' />
            {stat.hint && <SkeletonText className={STAT_HINT_CLASS} text={stat.hint} />}
          </Card>
        </div>
      ))}
    </div>
  );
}

/** Moldura do cartão de fluxo de caixa. */
const CASHFLOW_CARD_CLASS = 'p-5';

/** Título do cartão de fluxo de caixa. */
const CASHFLOW_TITLE = 'Fluxo de caixa';

/**
 * Cartão do fluxo de caixa dos últimos 12 meses.
 *
 * @param props - Pontos mensais e subtítulo do cartão
 * @returns Cartão com o gráfico de barras
 */
export function CashflowCard({ data, subtitle }: { data: CashflowPoint[]; subtitle: string }) {
  return (
    <Card className={CASHFLOW_CARD_CLASS}>
      <SectionHeader title={CASHFLOW_TITLE} subtitle={subtitle} />
      <CashflowChart data={data} />
    </Card>
  );
}

/**
 * Esqueleto do cartão de fluxo de caixa: mesmo cartão, cabeçalho real e o
 * gráfico em esqueleto na mesma altura.
 *
 * @param props - Subtítulo do cartão (o mesmo do `CashflowCard`)
 * @returns Cartão em esqueleto
 */
export function CashflowCardSkeleton({ subtitle }: { subtitle: string }) {
  return (
    <Card className={CASHFLOW_CARD_CLASS} aria-hidden>
      <SectionHeaderSkeleton title={CASHFLOW_TITLE} subtitle={subtitle} />
      <CashflowChartSkeleton />
    </Card>
  );
}

/** Cabeçalho do cartão de despesas por categoria. */
const EXPENSES_HEADER = { title: 'Para onde foi', subtitle: 'Despesas pagas por categoria' } as const;

/** Rótulo do centro da rosca de despesas. */
const EXPENSES_CENTER_LABEL = 'Despesas';

/**
 * Despesas do período por categoria, em rosca.
 *
 * @param props - Resumo
 * @returns Cartão com rosca ou estado vazio
 */
export function ExpensesByCategory({ summary }: { summary: Summary }) {
  const slices = summary.expensesByCategory.map(slice => ({ key: slice.categoryId ?? 'none', label: slice.name, value: slice.totalCents, color: palette(slice.color).cssVar }));
  return (
    <Card className={BLOCK_CARD_CLASS}>
      <SectionHeader title={EXPENSES_HEADER.title} subtitle={EXPENSES_HEADER.subtitle} />
      {slices.length ? (
        <DonutChart slices={slices} centerLabel={EXPENSES_CENTER_LABEL} />
      ) : (
        <EmptyState icon={PieIcon} title='Sem despesas' message='Nenhuma despesa paga neste período.' className='py-8' />
      )}
    </Card>
  );
}

/**
 * Esqueleto das despesas por categoria: mesmo cartão e cabeçalho, rosca com
 * cinco categorias na legenda.
 *
 * @returns Cartão em esqueleto
 */
export function ExpensesByCategorySkeleton() {
  return (
    <Card className={BLOCK_CARD_CLASS} aria-hidden>
      <SectionHeaderSkeleton title={EXPENSES_HEADER.title} subtitle={EXPENSES_HEADER.subtitle} />
      <DonutChartSkeleton centerLabel={EXPENSES_CENTER_LABEL} rows={5} />
    </Card>
  );
}

/** Cabeçalho do cartão de receitas por origem. */
const INCOME_HEADER = { title: 'De onde veio', subtitle: 'Receitas pagas por origem' } as const;

/** Lista das origens. */
const INCOME_LIST_CLASS = 'space-y-3.5';

/** Linha do nome e do valor de uma origem. */
const INCOME_ROW_CLASS = 'mb-1.5 flex items-baseline justify-between gap-3 text-subhead';

/** Valor de uma origem. */
const INCOME_VALUE_CLASS = 'shrink-0 font-semibold';

/** Trilho da barra de uma origem. */
const INCOME_TRACK_CLASS = 'h-1.5 overflow-hidden rounded-full bg-fill-2';

/** Larguras típicas (nome e barra) das origens no esqueleto. */
const INCOME_SKELETON_ROWS = [
  { name: '45%', bar: '100%' },
  { name: '60%', bar: '62%' },
  { name: '35%', bar: '38%' },
  { name: '50%', bar: '20%' },
] as const;

/**
 * Receitas do período por origem (recorrente ou categoria).
 *
 * @param props - Resumo
 * @returns Cartão com barras horizontais
 */
export function IncomeByOrigin({ summary }: { summary: Summary }) {
  const max = Math.max(...summary.incomeByOrigin.map(item => item.totalCents), 1);
  return (
    <Card className={BLOCK_CARD_CLASS}>
      <SectionHeader title={INCOME_HEADER.title} subtitle={INCOME_HEADER.subtitle} />
      {summary.incomeByOrigin.length ? (
        <ul className={INCOME_LIST_CLASS}>
          {summary.incomeByOrigin.map((item, index) => (
            <li key={item.key}>
              <div className={INCOME_ROW_CLASS}>
                <span className='min-w-0 truncate'>
                  <span className='font-medium'>{item.name}</span>
                </span>
                <Money cents={item.totalCents} className={INCOME_VALUE_CLASS} />
              </div>
              <div className={INCOME_TRACK_CLASS}>
                <motion.div
                  className='h-full rounded-full'
                  style={{ background: CHART_SERIES[index % CHART_SERIES.length] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.totalCents / max) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.1 + index * 0.05, ease: [0.32, 0.72, 0, 1] }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={TrendingUp} title='Sem receitas' message='Nenhuma receita paga neste período.' className='py-8' />
      )}
    </Card>
  );
}

/**
 * Esqueleto das receitas por origem: mesmo cartão e cabeçalho, quatro origens
 * com nome, valor e a barra no mesmo trilho.
 *
 * @returns Cartão em esqueleto
 */
export function IncomeByOriginSkeleton() {
  return (
    <Card className={BLOCK_CARD_CLASS} aria-hidden>
      <SectionHeaderSkeleton title={INCOME_HEADER.title} subtitle={INCOME_HEADER.subtitle} />
      <ul className={INCOME_LIST_CLASS}>
        {INCOME_SKELETON_ROWS.map((row, index) => (
          <li key={index}>
            <div className={INCOME_ROW_CLASS}>
              <SkeletonText className='min-w-0' width={row.name} />
              <SkeletonText className={cn('w-auto', INCOME_VALUE_CLASS)} width={88} />
            </div>
            <div className={INCOME_TRACK_CLASS}>
              <Skeleton className='h-full w-(--sk-bar) rounded-full' style={{ '--sk-bar': row.bar } as CSSProperties} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Cabeçalho do cartão da carteira. */
const ALLOCATION_HEADER = { title: 'Carteira', subtitle: 'Valor atual por classe' } as const;

/** Rótulo do centro da rosca da carteira. */
const ALLOCATION_CENTER_LABEL = 'Investido';

/**
 * Carteira por classe de ativo.
 *
 * @param props - Resumo
 * @returns Cartão com rosca, ou nada sem investimentos
 */
export function Allocation({ summary }: { summary: Summary }) {
  if (!summary.allocation.length) return null;
  const slices = summary.allocation.map((slice, index) => ({ key: slice.type, label: INVESTMENT_TYPE_LABELS[slice.type], value: slice.totalCents, color: CHART_SERIES[index % CHART_SERIES.length] }));
  return (
    <Card className={BLOCK_CARD_CLASS}>
      <SectionHeader title={ALLOCATION_HEADER.title} subtitle={ALLOCATION_HEADER.subtitle} />
      <DonutChart slices={slices} centerLabel={ALLOCATION_CENTER_LABEL} />
    </Card>
  );
}

/**
 * Esqueleto da carteira: mesmo cartão e cabeçalho, rosca com três classes.
 *
 * @returns Cartão em esqueleto
 */
export function AllocationSkeleton() {
  return (
    <Card className={BLOCK_CARD_CLASS} aria-hidden>
      <SectionHeaderSkeleton title={ALLOCATION_HEADER.title} subtitle={ALLOCATION_HEADER.subtitle} />
      <DonutChartSkeleton centerLabel={ALLOCATION_CENTER_LABEL} rows={3} />
    </Card>
  );
}

/** Cabeçalho do cartão de pendências. */
const UPCOMING_HEADER = { title: 'A vencer', subtitle: 'Pendentes nos próximos 30 dias' } as const;

/** Lista das pendências. */
const UPCOMING_LIST_CLASS = 'divide-y divide-border';

/** Linha de uma pendência. */
const UPCOMING_ROW_CLASS = 'flex items-center gap-3 py-2.5';

/** Forma do círculo do ícone. */
const UPCOMING_ICON_SHAPE_CLASS = 'size-8 rounded-full';

/** Descrição da pendência. */
const UPCOMING_DESCRIPTION_CLASS = 'truncate text-subhead font-medium';

/** Data (e livro) da pendência. */
const UPCOMING_DETAIL_CLASS = 'text-caption text-fg-muted';

/** Valor da pendência. */
const UPCOMING_VALUE_CLASS = 'text-subhead font-semibold';

/** Larguras típicas das descrições no esqueleto. */
const UPCOMING_SKELETON_WIDTHS = ['55%', '40%', '65%', '45%'] as const;

/**
 * Lançamentos pendentes dos próximos 30 dias (e atrasados).
 *
 * @param props - Resumo e se mostra o livro
 * @returns Cartão com a lista
 */
export function Upcoming({ summary, showLedger = false }: { summary: Summary; showLedger?: boolean }) {
  return (
    <Card className={BLOCK_CARD_CLASS}>
      <SectionHeader title={UPCOMING_HEADER.title} subtitle={UPCOMING_HEADER.subtitle} />
      {summary.upcoming.length ? (
        <ul className={UPCOMING_LIST_CLASS}>
          {summary.upcoming.map(item => {
            const income = item.kind === 'INCOME';
            return (
              <li key={item.transactionId} className={UPCOMING_ROW_CLASS}>
                <span className={cn('flex items-center justify-center', UPCOMING_ICON_SHAPE_CLASS, income ? 'bg-success-subtle text-success' : 'bg-fill-2 text-fg-muted')}>
                  <CalendarClock className='size-4' />
                </span>
                <div className='min-w-0 flex-1'>
                  <p className={UPCOMING_DESCRIPTION_CLASS}>{item.description}</p>
                  <p className={UPCOMING_DETAIL_CLASS}>
                    {formatDay(item.date)}
                    {showLedger && ` · ${item.ledgerName}`}
                  </p>
                </div>
                <Money cents={income ? item.amountCents : -item.amountCents} signed className={cn(UPCOMING_VALUE_CLASS, income && 'text-success')} />
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={CalendarClock} title='Nada pendente' message='Sem contas a pagar ou a receber pela frente.' className='py-8' />
      )}
    </Card>
  );
}

/**
 * Esqueleto das pendências: mesmo cartão e cabeçalho, quatro linhas com
 * ícone, descrição, data e valor.
 *
 * @returns Cartão em esqueleto
 */
export function UpcomingSkeleton() {
  return (
    <Card className={BLOCK_CARD_CLASS} aria-hidden>
      <SectionHeaderSkeleton title={UPCOMING_HEADER.title} subtitle={UPCOMING_HEADER.subtitle} />
      <ul className={UPCOMING_LIST_CLASS}>
        {UPCOMING_SKELETON_WIDTHS.map((width, index) => (
          <li key={index} className={UPCOMING_ROW_CLASS}>
            <Skeleton className={cn('shrink-0', UPCOMING_ICON_SHAPE_CLASS)} />
            <div className='min-w-0 flex-1'>
              <SkeletonText className={UPCOMING_DESCRIPTION_CLASS} width={width} />
              <SkeletonText className={UPCOMING_DETAIL_CLASS} width={88} />
            </div>
            <SkeletonText className={cn('w-auto', UPCOMING_VALUE_CLASS)} width={80} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
