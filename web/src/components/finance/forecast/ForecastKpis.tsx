/**
 * Cartões de KPI da previsão: situação, patrimônio, entradas, saídas, sobra,
 * recorrência mensal, mês selecionado e mês mais apertado.
 *
 * @module components/finance/forecast/ForecastKpis
 */
'use client';

import { ArrowDownLeft, ArrowUpRight, CalendarCheck, CalendarX2, type LucideIcon, Minus, PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { SkeletonText } from '@/components/ui/SkeletonKit';
import { cn } from '@/lib/cn';
import { formatMonthLong, formatPercent } from '@/lib/format';
import type { ForecastKpis as Kpis, GrowthStatus } from './forecastMath';

/** Grade dos cartões. */
const KPI_GRID_CLASS = 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4';

/** Caixa do cartão. */
const KPI_CARD_CLASS = 'h-full p-4 md:p-5';

/** Cabeçalho: ícone e rótulo. */
const KPI_HEADER_CLASS = 'flex items-center gap-2';

/** Círculo do ícone. */
const KPI_ICON_CLASS = 'flex size-6 items-center justify-center rounded-full bg-fill-2 text-fg-muted';

/** Rótulo do KPI. */
const KPI_LABEL_CLASS = 'text-footnote font-medium text-fg-muted';

/** Valor em destaque. */
const KPI_VALUE_CLASS = 'mt-2 block truncate font-display text-title-3 font-bold tracking-[-0.02em] sm:text-title-1';

/** Linha de apoio abaixo do valor. */
const KPI_HINT_CLASS = 'mt-0.5 text-caption text-fg-subtle';

/** Rótulo, ícone e tom de cada situação — o texto diz a situação, a cor só reforça. */
const STATUS: Record<GrowthStatus, { label: string; icon: LucideIcon; tone: string }> = {
  GROWING: { label: 'Crescendo', icon: TrendingUp, tone: 'text-success' },
  STABLE: { label: 'Estável', icon: Minus, tone: 'text-fg' },
  SHRINKING: { label: 'Encolhendo', icon: TrendingDown, tone: 'text-error' },
};

/** Rótulos dos cartões, usados também pelo esqueleto. */
const KPI_LABELS = ['Situação', 'Patrimônio hoje', 'Patrimônio no fim', 'Sobra no período', 'Entra no período', 'Sai no período', 'Mês selecionado', 'Mês mais apertado'] as const;

/**
 * Um cartão de KPI.
 *
 * @param props - Ícone, rótulo, valor e apoio
 * @returns Cartão
 */
function KpiCard({ icon: Icon, label, children, hint }: { icon: LucideIcon; label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <Card className={KPI_CARD_CLASS}>
      <div className={KPI_HEADER_CLASS}>
        <span className={KPI_ICON_CLASS}>
          <Icon className='size-3.5' strokeWidth={2.5} />
        </span>
        <p className={KPI_LABEL_CLASS}>{label}</p>
      </div>
      {children}
      {hint && <p className={KPI_HINT_CLASS}>{hint}</p>}
    </Card>
  );
}

/**
 * Apoio dos totais: quanto já aconteceu e quanto é estimativa, mais um extra.
 *
 * @param props - Realizado, previsto e texto extra
 * @returns Linha de apoio
 */
function SplitHint({ totals: [realized, forecast], extra }: { totals: [number, number]; extra?: ReactNode }) {
  return (
    <span className='flex flex-col'>
      {realized !== 0 && forecast !== 0 && (
        <span>
          <Money cents={realized} /> realizado · <Money cents={forecast} /> previsto
        </span>
      )}
      {extra && <span>{extra}</span>}
    </span>
  );
}

/**
 * Esqueleto dos KPIs: mesma grade, mesmos rótulos.
 *
 * @returns Cartões em esqueleto
 */
export function ForecastKpisSkeleton() {
  return (
    <div className={KPI_GRID_CLASS} aria-hidden>
      {KPI_LABELS.map(label => (
        <Card key={label} className={KPI_CARD_CLASS}>
          <div className={KPI_HEADER_CLASS}>
            <span className={cn(KPI_ICON_CLASS, 'bg-fill')} />
            <SkeletonText className={cn(KPI_LABEL_CLASS, 'w-auto')} text={label} />
          </div>
          <SkeletonText className={KPI_VALUE_CLASS} width='60%' />
          <SkeletonText className={KPI_HINT_CLASS} width='45%' />
        </Card>
      ))}
    </div>
  );
}

/**
 * KPIs da previsão.
 *
 * @param props - KPIs calculados e receita/custo recorrente do mês atual
 * @returns Grade de cartões
 *
 * @example
 * <ForecastKpis kpis={kpis} recurringIncomeCents={380000} recurringExpenseCents={50000} />
 */
export function ForecastKpis({ kpis, recurringIncomeCents, recurringExpenseCents }: { kpis: Kpis; recurringIncomeCents: number; recurringExpenseCents: number }) {
  const status = STATUS[kpis.status];
  return (
    <div className={KPI_GRID_CLASS}>
      <KpiCard icon={status.icon} label='Situação' hint={kpis.netWorthChangeRatio !== null ? `${formatPercent(kpis.netWorthChangeRatio)} de patrimônio no período` : 'Sem patrimônio para comparar'}>
        <p className={cn(KPI_VALUE_CLASS, 'flex items-center gap-2', status.tone)}>
          <status.icon className='size-6 shrink-0' aria-hidden />
          {status.label}
        </p>
      </KpiCard>
      <KpiCard icon={Wallet} label='Patrimônio hoje'>
        <Money cents={kpis.netWorthTodayCents} animated className={KPI_VALUE_CLASS} />
      </KpiCard>
      <KpiCard
        icon={PiggyBank}
        label='Patrimônio no fim'
        hint={
          <span>
            <Money cents={kpis.netWorthChangeCents} signed tone='auto' />
            {kpis.periodStartMonth && ` desde ${formatMonthLong(kpis.periodStartMonth.slice(0, 7)).toLowerCase()}`}
          </span>
        }
      >
        <Money cents={kpis.netWorthEndCents} animated className={KPI_VALUE_CLASS} />
      </KpiCard>
      <KpiCard
        icon={TrendingUp}
        label='Sobra no período'
        hint={
          <span>
            {kpis.marginRatio !== null && `${formatPercent(kpis.marginRatio)} do que entra · `}média <Money cents={kpis.averageResultCents} signed />
            /mês
          </span>
        }
      >
        <Money cents={kpis.resultCents} signed tone='auto' animated className={KPI_VALUE_CLASS} />
      </KpiCard>
      <KpiCard
        icon={ArrowDownLeft}
        label='Entra no período'
        hint={
          <SplitHint
            totals={[kpis.realized.incomeCents, kpis.forecast.incomeCents]}
            extra={
              <>
                Recorrente: média de <Money cents={recurringIncomeCents} />
                /mês
              </>
            }
          />
        }
      >
        <Money cents={kpis.incomeCents} animated className={KPI_VALUE_CLASS} />
      </KpiCard>
      <KpiCard
        icon={ArrowUpRight}
        label='Sai no período'
        hint={
          <SplitHint
            totals={[kpis.realized.expenseCents, kpis.forecast.expenseCents]}
            extra={
              <>
                Custo fixo: média de <Money cents={recurringExpenseCents} />
                /mês
              </>
            }
          />
        }
      >
        <Money cents={kpis.expenseCents} animated className={KPI_VALUE_CLASS} />
      </KpiCard>
      <KpiCard
        icon={CalendarCheck}
        label='Mês selecionado'
        hint={
          kpis.selected ? (
            <span>
              {formatMonthLong(kpis.selected.month.slice(0, 7))} · patrimônio <Money cents={kpis.selected.netWorthEndCents} />
            </span>
          ) : undefined
        }
      >
        <Money cents={kpis.selected?.resultCents ?? 0} signed tone='auto' className={KPI_VALUE_CLASS} />
      </KpiCard>
      <KpiCard icon={CalendarX2} label='Mês mais apertado' hint={kpis.tightestMonth ? `Menor saldo em conta · ${formatMonthLong(kpis.tightestMonth.month.slice(0, 7))}` : undefined}>
        <Money cents={kpis.tightestMonth?.cashEndCents ?? 0} className={KPI_VALUE_CLASS} />
      </KpiCard>
    </div>
  );
}
