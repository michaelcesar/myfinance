/**
 * Visão geral: tudo consolidado e um cartão por livro.
 *
 * @module app/(app)/visao-geral/OverviewView
 */
'use client';

import { ChevronRight, Plus, User } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import {
  Allocation,
  AllocationSkeleton,
  CashflowCard,
  CashflowCardSkeleton,
  ExpensesByCategory,
  ExpensesByCategorySkeleton,
  IncomeByOrigin,
  IncomeByOriginSkeleton,
  NetWorthCard,
  NetWorthCardSkeleton,
  PeriodStats,
  PeriodStatsSkeleton,
  Reveal,
  SUMMARY_GRID_CLASS,
  Upcoming,
  UpcomingSkeleton,
} from '@/components/finance/SummaryBlocks';
import { PAGE_STACK_CLASS, PageHeader } from '@/components/layout/PageHeader';
import { PeriodPicker, PeriodPickerSkeleton } from '@/components/layout/PeriodPicker';
import { useQuickAdd } from '@/components/layout/QuickAddProvider';
import { Button } from '@/components/ui/Button';
import { CARD_CLASS, Card, SectionHeader } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/Feedback';
import { IconTile } from '@/components/ui/IconTile';
import { Money } from '@/components/ui/Money';
import { ButtonSkeleton, IconTileSkeleton, PageHeaderSkeleton, SectionHeaderSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { useOverview } from '@/hooks/useFinance';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { usePeriod } from '@/providers/PeriodProvider';
import type { Overview } from '@/types/entities';

const PAGE_TITLE = 'Visão geral';
const PAGE_SUBTITLE = 'Pessoal e empresas, consolidados. Transferências entre seus livros não contam em dobro.';
const NET_WORTH_TITLE = 'Patrimônio total';
const CASHFLOW_SUBTITLE = 'Receitas e despesas de todos os livros, últimos 12 meses';
const NEW_TRANSACTION_LABEL = 'Lançamento';

/** Botão de novo lançamento: só no desktop (no celular há o botão flutuante). */
const NEW_TRANSACTION_CLASS = 'max-md:hidden';

/** Cabeçalho da seção dos livros. */
const LEDGERS_HEADER = { title: 'Seus livros', subtitle: 'Patrimônio e resultado do período', action: 'Empresas' } as const;

/** Respiro extra acima das seções de livros e de fluxo de caixa. */
const SECTION_GAP_CLASS = 'mt-4';

/** Grade dos cartões de livro — a tela e o esqueleto usam a mesma. */
const LEDGER_GRID_CLASS = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3';

/** Moldura interna do cartão de livro. */
const LEDGER_CARD_CLASS = 'h-full p-5';

/** Nome do livro. */
const LEDGER_NAME_CLASS = 'truncate text-callout font-semibold';

/** Tipo do livro (pessoal ou empresa). */
const LEDGER_TYPE_CLASS = 'text-caption text-fg-muted';

/** Patrimônio do livro. */
const LEDGER_VALUE_CLASS = 'mt-4 block font-display text-title-1 font-bold tracking-[-0.02em]';

/** Legenda do patrimônio. */
const LEDGER_VALUE_LABEL_CLASS = 'text-caption text-fg-muted';

/** Faixa dos indicadores no pé do cartão. */
const LEDGER_STATS_CLASS = 'mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-caption';

/** Valor de cada indicador. */
const LEDGER_STAT_VALUE_CLASS = 'font-semibold';

/** Rótulos dos indicadores, na ordem do cartão. */
const LEDGER_STAT_LABELS = ['Receitas', 'Despesas', 'Resultado'] as const;

/**
 * Saudação pela hora do dia.
 *
 * @returns "Bom dia", "Boa tarde" ou "Boa noite"
 */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Cartão de um livro na visão geral, com link para a tela dele.
 *
 * @param props - Bloco do livro
 * @returns Link em forma de cartão
 */
function LedgerCard({ ledger }: { ledger: Overview['ledgers'][number] }) {
  const href = ledger.type === 'PERSONAL' ? '/pessoal' : `/empresas/${ledger.ledgerId}`;
  const values = [ledger.incomeCents, ledger.expenseCents, ledger.incomeCents - ledger.expenseCents];
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
      <Link href={href} className={cn('group block', CARD_CLASS, LEDGER_CARD_CLASS)}>
        <div className='flex items-center gap-3'>
          {ledger.type === 'PERSONAL' ? <IconTile icon={User} /> : <IconTile text={initials(ledger.name)} />}
          <div className='min-w-0 flex-1'>
            <p className={LEDGER_NAME_CLASS}>{ledger.name}</p>
            <p className={LEDGER_TYPE_CLASS}>{ledger.type === 'PERSONAL' ? 'Pessoal' : 'Empresa'}</p>
          </div>
          <ChevronRight className='size-5 text-fg-subtle transition-transform group-hover:translate-x-0.5' />
        </div>
        <Money cents={ledger.cashCents + ledger.investmentsCents} className={LEDGER_VALUE_CLASS} />
        <p className={LEDGER_VALUE_LABEL_CLASS}>patrimônio</p>
        <div className={LEDGER_STATS_CLASS}>
          {LEDGER_STAT_LABELS.map((label, position) => (
            <div key={label}>
              <p className='text-fg-muted'>{label}</p>
              <Money cents={values[position]} compact signed={label === 'Resultado'} tone={label === 'Resultado' ? 'auto' : undefined} className={LEDGER_STAT_VALUE_CLASS} />
            </div>
          ))}
        </div>
      </Link>
    </motion.div>
  );
}

/**
 * Esqueleto do cartão de livro: mesmo cartão, bloco do ícone, nome, tipo,
 * patrimônio e a faixa dos três indicadores com os rótulos reais.
 *
 * @returns Cartão em esqueleto
 */
export function LedgerCardSkeleton() {
  return (
    <Card className={LEDGER_CARD_CLASS} aria-hidden>
      <div className='flex items-center gap-3'>
        <IconTileSkeleton />
        <div className='min-w-0 flex-1'>
          <SkeletonText className={LEDGER_NAME_CLASS} width='55%' />
          <SkeletonText className={LEDGER_TYPE_CLASS} width={56} />
        </div>
      </div>
      <SkeletonText className={LEDGER_VALUE_CLASS} width='50%' />
      <SkeletonText className={LEDGER_VALUE_LABEL_CLASS} text='patrimônio' />
      <div className={LEDGER_STATS_CLASS}>
        {LEDGER_STAT_LABELS.map(label => (
          <div key={label}>
            <SkeletonText className='text-fg-muted' text={label} />
            <SkeletonText className={LEDGER_STAT_VALUE_CLASS} width='70%' />
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Esqueleto da visão geral — usado pelo `loading.tsx` e enquanto o resumo
 * consolidado carrega. Mesma pilha, mesmos blocos e cabeçalhos da tela.
 *
 * @returns Página em esqueleto
 */
export function OverviewPageSkeleton() {
  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeaderSkeleton
        eyebrow
        title={PAGE_TITLE}
        subtitle={PAGE_SUBTITLE}
        actions={
          <>
            <PeriodPickerSkeleton />
            <ButtonSkeleton label={NEW_TRANSACTION_LABEL} icon className={NEW_TRANSACTION_CLASS} />
          </>
        }
      />
      <NetWorthCardSkeleton title={NET_WORTH_TITLE} />
      <PeriodStatsSkeleton />
      <div className={SECTION_GAP_CLASS}>
        <SectionHeaderSkeleton title={LEDGERS_HEADER.title} subtitle={LEDGERS_HEADER.subtitle} action={LEDGERS_HEADER.action} />
        <div className={LEDGER_GRID_CLASS}>
          <LedgerCardSkeleton />
          <LedgerCardSkeleton />
        </div>
      </div>
      <div className={SECTION_GAP_CLASS}>
        <CashflowCardSkeleton subtitle={CASHFLOW_SUBTITLE} />
      </div>
      <div className={SUMMARY_GRID_CLASS}>
        <IncomeByOriginSkeleton />
        <ExpensesByCategorySkeleton />
        <UpcomingSkeleton />
        <AllocationSkeleton />
      </div>
    </div>
  );
}

/**
 * Tela da visão geral.
 *
 * @returns Visão geral consolidada
 */
export function OverviewView() {
  const { user } = useAuth();
  const period = usePeriod();
  const { open } = useQuickAdd();
  const overview = useOverview({ from: period.from, to: period.to });
  const firstName = user?.name.split(' ')[0] ?? '';

  if (overview.isPending) return <OverviewPageSkeleton />;

  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeader
        eyebrow={<p className='text-footnote font-semibold tracking-wide text-fg-muted uppercase'>{`${greeting()}, ${firstName}`}</p>}
        title={PAGE_TITLE}
        subtitle={PAGE_SUBTITLE}
        actions={
          <>
            <PeriodPicker />
            <Button icon={<Plus className='size-4' strokeWidth={2.6} />} onClick={() => open()} className={NEW_TRANSACTION_CLASS}>
              {NEW_TRANSACTION_LABEL}
            </Button>
          </>
        }
      />

      {overview.isError ? (
        <ErrorState message={overview.error.message} onRetry={() => void overview.refetch()} />
      ) : (
        <>
          <Reveal>
            <NetWorthCard summary={overview.data} title={NET_WORTH_TITLE} />
          </Reveal>
          <PeriodStats summary={overview.data} />

          <Reveal index={4} className={SECTION_GAP_CLASS}>
            <SectionHeader
              title={LEDGERS_HEADER.title}
              subtitle={LEDGERS_HEADER.subtitle}
              action={
                <Link href='/empresas' className='text-body font-medium text-fg-muted hover:text-fg'>
                  {LEDGERS_HEADER.action}
                </Link>
              }
            />
            <div className={LEDGER_GRID_CLASS}>
              {overview.data.ledgers.map(ledger => (
                <LedgerCard key={ledger.ledgerId} ledger={ledger} />
              ))}
            </div>
          </Reveal>

          <Reveal index={5} className={SECTION_GAP_CLASS}>
            <CashflowCard data={overview.data.monthly} subtitle={CASHFLOW_SUBTITLE} />
          </Reveal>

          <div className={SUMMARY_GRID_CLASS}>
            <Reveal index={6}>
              <IncomeByOrigin summary={overview.data} />
            </Reveal>
            <Reveal index={7}>
              <ExpensesByCategory summary={overview.data} />
            </Reveal>
            <Reveal index={8}>
              <Upcoming summary={overview.data} showLedger />
            </Reveal>
            <Reveal index={9}>
              <Allocation summary={overview.data} />
            </Reveal>
          </div>
        </>
      )}
    </div>
  );
}
