/**
 * Seções da tela de análises: frases de decisão, gastos por categoria, onde
 * economizar, fixo × variável, receitas e tendência das maiores categorias.
 *
 * @module components/finance/analysis/AnalysisSections
 */
'use client';

import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Info, type LucideIcon, PieChart, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Card, SectionHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { SegmentedControl, SegmentedControlSkeleton } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { SectionHeaderSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { cn } from '@/lib/cn';
import { formatDay, formatMoney, formatMonthShort } from '@/lib/format';
import type { Analysis, AnalysisCategory, AnalysisOrigin } from '@/types/entities';
import { availableIncome, type DataWindow, type Insight, incomeStability, OTHER_LEDGERS_LABEL, insights, rankCategories, savingsCandidates, type StabilityStatus } from './analysisMath';

/** Caixa padrão das seções em cartão. */
const SECTION_CARD_CLASS = 'p-4 md:p-5';

/** Lista com divisórias. */
const LIST_CLASS = 'divide-y divide-border';

/** Linha clicável de lista. */
const ROW_BUTTON_CLASS = 'flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-fill-2 focus-visible:bg-fill-2 focus-visible:outline-none rounded-lg px-2';

/** Barra de fundo do ranking. */
const BAR_TRACK_CLASS = 'mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-fill';

/** Barra preenchida do ranking. */
const BAR_FILL_CLASS = 'h-full rounded-full bg-primary';

/** Ícone por tom das frases — o texto diz o que é, a cor só reforça. */
const TONE: Record<Insight['tone'], { icon: LucideIcon; className: string }> = {
  warning: { icon: AlertTriangle, className: 'text-warning' },
  good: { icon: CheckCircle2, className: 'text-success' },
  info: { icon: Info, className: 'text-fg-muted' },
};

/** Rótulo de estabilidade. */
const STABILITY_LABEL: Record<StabilityStatus, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  STABLE: { label: 'Estável', tone: 'success' },
  VARIABLE: { label: 'Variável', tone: 'warning' },
  IRREGULAR: { label: 'Irregular', tone: 'error' },
};

/**
 * Média mensal de uma série, só nos meses da janela (com dados e completos).
 *
 * @param series - Valor de cada mês do período
 * @param window - Janela de meses
 * @returns Média em centavos
 */
function windowAverage(series: number[], window: DataWindow): number {
  if (!window.count) return 0;
  return Math.round(series.slice(window.start, window.end).reduce((sum, value) => sum + value, 0) / window.count);
}

/**
 * Explica de quais meses vem a média.
 *
 * @param window - Janela de meses
 * @param totalMonths - Meses do período
 * @returns Texto curto
 */
function windowNote(window: DataWindow, totalMonths: number): string {
  if (!window.count) return 'ainda sem meses com dados';
  const months = window.count === 1 ? '1 mês' : `${window.count} meses`;
  if (!window.partialCurrent) return `média de ${months} com dados`;
  return window.end === totalMonths ? 'só o mês atual, ainda em curso' : `média de ${months} com dados; o mês atual, em curso, fica de fora`;
}

/**
 * Variação contra o período anterior, com sinal e seta (não só cor). A cor
 * segue o que é bom: em gasto, cair é bom; em receita, subir é bom.
 *
 * @param props - Atual, anterior e qual direção é boa
 * @returns Texto da variação, ou "novo" sem base
 */
function Change({ current, previous, goodWhen = 'down' }: { current: number; previous: number; goodWhen?: 'up' | 'down' }) {
  if (previous <= 0) return <span className='text-caption text-fg-subtle'>{current > 0 ? 'novo' : ''}</span>;
  const ratio = (current - previous) / previous;
  const up = ratio > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const good = goodWhen === 'up' ? ratio >= 0 : ratio <= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-caption font-medium', good ? 'text-success' : 'text-error')}>
      <Icon className='size-3.5' aria-hidden />
      {`${up ? '+' : ''}${Math.round(ratio * 100)}%`}
    </span>
  );
}

/**
 * Leva a página até uma seção.
 *
 * @param id - Id da seção
 */
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Esqueleto de uma seção em cartão.
 *
 * @param props - Título e altura do conteúdo
 * @returns Seção em esqueleto
 */
export function AnalysisSectionSkeleton({ title, height = 'h-[220px]' }: { title: string; height?: string }) {
  return (
    <div aria-hidden>
      <SectionHeaderSkeleton title={title} subtitle />
      <Card className={SECTION_CARD_CLASS}>
        <Skeleton className={cn('w-full rounded-xl', height)} />
      </Card>
    </div>
  );
}

/**
 * "O que fazer agora": frases de decisão; cada uma leva à seção de onde veio.
 *
 * @param props - Análise e mês atual (`YYYY-MM`)
 * @returns Cartão com as frases
 */
export function AnalysisInsights({ analysis, current }: { analysis: Analysis; current: string }) {
  const items = insights(analysis, current);
  return (
    <section>
      <SectionHeader title='O que fazer agora' subtitle='Conclusões tiradas dos seus números. Clique para ver o detalhe.' />
      <Card className={SECTION_CARD_CLASS}>
        {items.length ? (
          <ul className={LIST_CLASS}>
            {items.map(item => {
              const tone = TONE[item.tone];
              return (
                <li key={item.text}>
                  <button type='button' className={ROW_BUTTON_CLASS} onClick={() => scrollToSection(item.target)}>
                    <tone.icon className={cn('size-5 shrink-0', tone.className)} aria-hidden />
                    <span className='text-subhead'>{item.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className='px-2 py-3 text-subhead text-fg-muted'>Ainda não há lançamentos pagos suficientes no período para tirar conclusões.</p>
        )}
      </Card>
    </section>
  );
}

/**
 * Gastos por categoria, maiores ou menores, com média mensal, peso e variação.
 *
 * @param props - Análise, janela das médias e ação de abrir a categoria
 * @returns Seção do ranking
 */
export function ExpenseRanking({ analysis, window, onOpenCategory }: { analysis: Analysis; window: DataWindow; onOpenCategory: (category: AnalysisCategory) => void }) {
  const [order, setOrder] = useState<'top' | 'bottom'>('top');
  const ranked = rankCategories(analysis.expenseCategories, order);
  const largest = ranked.reduce((max, item) => Math.max(max, item.totalCents), 0);
  return (
    <section id='gastos' className='scroll-mt-6'>
      <SectionHeader
        title='Gastos por categoria'
        subtitle={`Por mês (${windowNote(window, analysis.months.length)}), peso no total e variação contra o período anterior.`}
        action={
          <SegmentedControl
            label='Ordem'
            size='sm'
            segments={[
              { value: 'top', label: 'Maiores' },
              { value: 'bottom', label: 'Menores' },
            ]}
            value={order}
            onChange={setOrder}
          />
        }
      />
      <Card className={SECTION_CARD_CLASS}>
        {ranked.length ? (
          <ul className={LIST_CLASS}>
            {ranked.map(item => (
              <li key={item.key}>
                <button type='button' className={ROW_BUTTON_CLASS} onClick={() => onOpenCategory(item)}>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-baseline justify-between gap-3'>
                      <span className='truncate text-body font-medium'>{item.name}</span>
                      <span className='shrink-0 text-body font-semibold tabular'>
                        {formatMoney(windowAverage(item.monthly, window))}
                        <span className='text-caption font-normal text-fg-muted'>/mês</span>
                      </span>
                    </div>
                    <div className={BAR_TRACK_CLASS}>
                      <div className={BAR_FILL_CLASS} style={{ width: `${largest ? (item.totalCents / largest) * 100 : 0}%` }} />
                    </div>
                    <div className='mt-1 flex items-center justify-between gap-3 text-caption text-fg-muted'>
                      <span>
                        {analysis.expenseCents ? `${Math.round((item.totalCents / analysis.expenseCents) * 100)}% do total` : ''} · <Money cents={item.totalCents} /> no período
                      </span>
                      <Change current={item.totalCents} previous={item.previousCents} />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={PieChart} title='Sem gastos pagos no período' message='Quando houver despesas pagas, elas aparecem aqui por categoria.' />
        )}
      </Card>
    </section>
  );
}

/**
 * Onde economizar: gastos variáveis que mais cresceram e maiores avulsos.
 *
 * @param props - Análise e ações de abrir a categoria e o gasto avulso
 * @returns Seção de economia
 */
export function SavingsSection({
  analysis,
  onOpenCategory,
  onOpenExpense,
}: {
  analysis: Analysis;
  onOpenCategory: (category: AnalysisCategory) => void;
  onOpenExpense: (transactionId: string) => void;
}) {
  const growing = savingsCandidates(analysis.expenseCategories).slice(0, 5);
  return (
    <section id='economizar' className='scroll-mt-6'>
      <SectionHeader title='Onde economizar' subtitle='Gastos variáveis (sem contrato) que mais cresceram e os maiores gastos avulsos.' />
      <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
        <Card className={SECTION_CARD_CLASS}>
          <p className='mb-1 px-2 text-footnote font-semibold text-fg-muted'>Variáveis que mais cresceram</p>
          {growing.length ? (
            <ul className={LIST_CLASS}>
              {growing.map(item => (
                <li key={item.key}>
                  <button type='button' className={ROW_BUTTON_CLASS} onClick={() => onOpenCategory(item)}>
                    <span className='min-w-0 flex-1 truncate text-body'>{item.name}</span>
                    <span className='shrink-0 text-right'>
                      <span className='block text-body font-semibold tabular'>+{formatMoney(item.variableCents - item.previousVariableCents)}</span>
                      <span className='block text-caption text-fg-muted'>
                        {formatMoney(item.previousVariableCents)} → {formatMoney(item.variableCents)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className='px-2 py-3 text-subhead text-fg-muted'>Nenhum gasto variável cresceu contra o período anterior.</p>
          )}
        </Card>
        <Card className={SECTION_CARD_CLASS}>
          <p className='mb-1 px-2 text-footnote font-semibold text-fg-muted'>Maiores gastos avulsos</p>
          {analysis.topExpenses.length ? (
            <ul className={LIST_CLASS}>
              {analysis.topExpenses.map(item => (
                <li key={item.transactionId}>
                  <button type='button' className={ROW_BUTTON_CLASS} onClick={() => onOpenExpense(item.transactionId)}>
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-body'>{item.description}</span>
                      <span className='block truncate text-caption text-fg-muted'>{[formatDay(item.date), item.categoryName, item.ledgerName].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className='shrink-0 text-body font-semibold tabular'>{formatMoney(item.amountCents)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className='px-2 py-3 text-subhead text-fg-muted'>Nenhum gasto avulso pago no período.</p>
          )}
        </Card>
      </div>
    </section>
  );
}

/**
 * Fixo × variável: quanto cada um soma e quanto come da renda.
 *
 * @param props - Análise e ações de abrir recorrentes e lançamentos
 * @returns Seção fixo × variável
 */
export function FixedVariable({ analysis, onOpenRecurrences, onOpenTransactions }: { analysis: Analysis; onOpenRecurrences: () => void; onOpenTransactions: () => void }) {
  const income = availableIncome(analysis);
  const parts = [
    { label: 'Fixo (contratos e contas fixas)', cents: analysis.fixedExpenseCents, onClick: onOpenRecurrences },
    { label: 'Variável (avulsos)', cents: analysis.variableExpenseCents, onClick: onOpenTransactions },
    ...(analysis.transferOutCents > 0 ? [{ label: 'Enviado a outros livros (pró-labore, lucros)', cents: analysis.transferOutCents, onClick: onOpenTransactions }] : []),
  ];
  return (
    <section id='fixo' className='scroll-mt-6'>
      <SectionHeader title='Fixo × variável' subtitle='Quanto dos gastos é compromisso todo mês e quanto é escolha do dia a dia.' />
      <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', parts.length > 2 && 'lg:grid-cols-3')}>
        {parts.map(part => (
          <Card key={part.label} className='p-0'>
            <button
              type='button'
              className='block w-full rounded-card p-4 text-left transition-colors hover:bg-fill-2 focus-visible:bg-fill-2 focus-visible:outline-none md:p-5'
              onClick={part.onClick}
            >
              <p className='text-footnote font-medium text-fg-muted'>{part.label}</p>
              <Money cents={part.cents} className='mt-2 block font-display text-title-2 font-bold' />
              <p className='mt-0.5 text-caption text-fg-subtle'>no período · {income ? `${Math.round((part.cents / income) * 100)}% da renda` : 'sem renda no período'}</p>
            </button>
          </Card>
        ))}
      </div>
    </section>
  );
}

/**
 * Receitas por origem, com peso na renda e estabilidade.
 *
 * @param props - Análise, janela da estabilidade e ações de abrir a origem e as transferências
 * @returns Seção de receitas
 */
export function IncomeOrigins({
  analysis,
  window,
  onOpenOrigin,
  onOpenTransfers,
}: {
  analysis: Analysis;
  window: DataWindow;
  onOpenOrigin: (origin: AnalysisOrigin) => void;
  onOpenTransfers: () => void;
}) {
  return (
    <section id='receitas' className='scroll-mt-6'>
      <SectionHeader title='Receitas' subtitle='Maiores fontes, quanto pesam na renda e quão estáveis são.' />
      <Card className={SECTION_CARD_CLASS}>
        {analysis.incomeOrigins.length || analysis.transferInCents > 0 ? (
          <ul className={LIST_CLASS}>
            {analysis.incomeOrigins.map(origin => {
              const stability = incomeStability(origin.monthly, window);
              const stopped = origin.totalCents === 0 && origin.previousCents > 0;
              const label = STABILITY_LABEL[stability.status];
              return (
                <li key={origin.key}>
                  <button type='button' className={ROW_BUTTON_CLASS} onClick={() => onOpenOrigin(origin)}>
                    <span className='min-w-0 flex-1'>
                      <span className='flex items-center gap-2'>
                        <span className='truncate text-body font-medium'>{origin.name}</span>
                        {stopped ? <Badge tone='error'>Parou de entrar</Badge> : <Badge tone={label.tone}>{label.label}</Badge>}
                      </span>
                      <span className='block text-caption text-fg-muted'>
                        {availableIncome(analysis) ? `${Math.round((origin.totalCents / availableIncome(analysis)) * 100)}% da renda` : ''} · entrou em {stability.monthsWithIncome} de{' '}
                        {analysis.months.length} meses
                      </span>
                    </span>
                    <span className='shrink-0 text-right'>
                      <span className='block text-body font-semibold tabular'>{formatMoney(origin.totalCents)}</span>
                      <Change current={origin.totalCents} previous={origin.previousCents} goodWhen='up' />
                    </span>
                  </button>
                </li>
              );
            })}
            {analysis.transferInCents > 0 && (
              <li>
                <button type='button' className={ROW_BUTTON_CLASS} onClick={onOpenTransfers}>
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-body font-medium'>Recebido de {OTHER_LEDGERS_LABEL.toLowerCase()}</span>
                    <span className='block text-caption text-fg-muted'>
                      {`${Math.round((analysis.transferInCents / availableIncome(analysis)) * 100)}% da renda`} · transferência entre seus livros, não conta como receita
                    </span>
                  </span>
                  <span className='shrink-0 text-body font-semibold tabular'>{formatMoney(analysis.transferInCents)}</span>
                </button>
              </li>
            )}
          </ul>
        ) : (
          <EmptyState icon={Wallet} title='Sem receitas pagas no período' message='Quando houver receitas pagas, elas aparecem aqui por origem.' />
        )}
      </Card>
    </section>
  );
}

/**
 * Tendência: mini-gráficos mês a mês das maiores categorias de gasto.
 *
 * @param props - Análise e ação de abrir a categoria
 * @returns Seção de tendência
 */
export function CategoryTrends({ analysis, onOpenCategory }: { analysis: Analysis; onOpenCategory: (category: AnalysisCategory) => void }) {
  const top = rankCategories(analysis.expenseCategories, 'top').slice(0, 6);
  if (!top.length || analysis.months.length < 2) return null;
  return (
    <section>
      <SectionHeader title='Tendência das maiores categorias' subtitle='Gasto de cada mês do período.' />
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
        {top.map(item => (
          <Card key={item.key} className='p-0'>
            <button
              type='button'
              className='block w-full rounded-card p-4 text-left transition-colors hover:bg-fill-2 focus-visible:bg-fill-2 focus-visible:outline-none'
              onClick={() => onOpenCategory(item)}
            >
              <div className='flex items-baseline justify-between gap-3'>
                <span className='truncate text-subhead font-medium'>{item.name}</span>
                <Change current={item.totalCents} previous={item.previousCents} />
              </div>
              <div className='mt-2 h-[64px]' role='img' aria-label={`Gasto mensal de ${item.name}`}>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={item.monthly.map((value, index) => ({ month: analysis.months[index].slice(0, 7), value }))}>
                    <Tooltip
                      content={props => {
                        const point = props.payload?.[0]?.payload as { month: string; value: number } | undefined;
                        return props.active && point ? (
                          <div className='rounded-lg bg-elevated/90 px-2.5 py-1.5 text-caption shadow-float'>
                            {formatMonthShort(point.month)}: <span className='tabular'>{formatMoney(point.value)}</span>
                          </div>
                        ) : null;
                      }}
                    />
                    <Line type='monotone' dataKey='value' stroke='var(--chart-1)' strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </button>
          </Card>
        ))}
      </div>
    </section>
  );
}

/**
 * Esqueleto do ranking de gastos: cabeçalho com o seletor e linhas.
 *
 * @returns Ranking em esqueleto
 */
export function ExpenseRankingSkeleton() {
  return (
    <div aria-hidden>
      <div className='mb-3 flex items-end justify-between gap-3 px-1'>
        <SkeletonText className='w-auto text-title-3' text='Gastos por categoria' />
        <SegmentedControlSkeleton labels={['Maiores', 'Menores']} size='sm' />
      </div>
      <Card className={SECTION_CARD_CLASS}>
        <Skeleton className='h-[260px] w-full rounded-xl' />
      </Card>
    </div>
  );
}
