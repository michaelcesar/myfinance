/**
 * Tela de um livro — o pessoal ou uma empresa — com resumo e abas.
 *
 * @module components/finance/LedgerView
 */
'use client';

import { Pencil, Plus, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { PAGE_ACTIONS_CLASS, PAGE_HEADER_CLASS, PAGE_STACK_CLASS, PAGE_SUBTITLE_CLASS, PAGE_TITLE_CLASS, PageHeader } from '@/components/layout/PageHeader';
import { PeriodPicker, PeriodPickerSkeleton } from '@/components/layout/PeriodPicker';
import { useQuickAdd } from '@/components/layout/QuickAddProvider';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/Feedback';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile } from '@/components/ui/IconTile';
import { SegmentedControl, SegmentedControlSkeleton, type Segment } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { ButtonSkeleton, IconTileSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { useLedgerSummary } from '@/hooks/useFinance';
import { formatDocument, initials } from '@/lib/format';
import { usePeriod } from '@/providers/PeriodProvider';
import type { Ledger } from '@/types/entities';
import { AccountsPanel } from './AccountsPanel';
import { InvestmentsPanel } from './InvestmentsPanel';
import { LedgerSheet } from './LedgerSheet';
import { RecurrencesPanel } from './RecurrencesPanel';
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
} from './SummaryBlocks';
import { TransactionsPanel } from './TransactionsPanel';

type Tab = 'summary' | 'transactions' | 'recurring' | 'accounts' | 'investments';

/** Tipo do livro. */
type LedgerType = Ledger['type'];

/** Subtítulo do livro pessoal sem razão social nem documento. */
const PERSONAL_SUBTITLE = 'Seus ganhos, gastos e investimentos.';

/** Subtítulo do fluxo de caixa de um livro. */
const CASHFLOW_SUBTITLE = 'Últimos 12 meses';

/** Rótulo do botão de novo lançamento. */
const NEW_TRANSACTION_LABEL = 'Lançamento';

/** Botão de novo lançamento: só no desktop (no celular há o botão flutuante). */
const NEW_TRANSACTION_CLASS = 'max-md:hidden';

/** Caixa do sobretítulo do cabeçalho (a mesma que o `PageHeader` dá ao `eyebrow`). */
const EYEBROW_BOX_CLASS = 'mb-2';

/** Sobretítulo: bloco do livro e "Livro pessoal" ou "Empresa". */
const EYEBROW_CLASS = 'flex items-center gap-2 text-footnote font-medium text-fg-muted';

/** Barra das abas: rola no celular, encolhe ao conteúdo no desktop. */
const TABS_CLASS = 'no-scrollbar mb-2 w-full overflow-x-auto md:w-auto';

/** Pilha dos blocos do resumo. */
const SUMMARY_STACK_CLASS = 'flex flex-col gap-4';

/**
 * Abas do livro, na ordem da barra. A tela e o esqueleto usam a mesma lista.
 *
 * @returns Abas
 */
function ledgerTabs(): Segment<Tab>[] {
  return [
    { value: 'summary', label: 'Resumo' },
    { value: 'transactions', label: 'Lançamentos' },
    { value: 'recurring', label: 'Recorrentes' },
    { value: 'accounts', label: 'Contas' },
    { value: 'investments', label: 'Investimentos' },
  ];
}

/**
 * Rótulo do destaque do patrimônio.
 *
 * @param type - Tipo do livro
 * @returns "Seu patrimônio" ou "Patrimônio da empresa"
 */
function netWorthTitle(type: LedgerType): string {
  return type === 'PERSONAL' ? 'Seu patrimônio' : 'Patrimônio da empresa';
}

/**
 * Esqueleto da aba "Resumo" de um livro: os mesmos blocos da aba, na mesma
 * pilha. A tela usa enquanto o resumo do período carrega.
 *
 * @param props - Tipo do livro (define o rótulo do patrimônio e o quarto indicador)
 * @returns Resumo em esqueleto
 */
export function LedgerSummarySkeleton({ ledgerType }: { ledgerType: LedgerType }) {
  return (
    <div className={SUMMARY_STACK_CLASS} aria-hidden>
      <NetWorthCardSkeleton title={netWorthTitle(ledgerType)} />
      <PeriodStatsSkeleton ledgerType={ledgerType} />
      <CashflowCardSkeleton subtitle={CASHFLOW_SUBTITLE} />
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
 * Esqueleto da tela de um livro — o pessoal ou uma empresa: cabeçalho com
 * sobretítulo, nome e subtítulo, as ações, a barra de abas e a aba "Resumo".
 * As telas do livro pessoal e da empresa o usam no `loading.tsx` e enquanto
 * o livro carrega.
 *
 * @param props - Tipo do livro
 * @returns Página em esqueleto
 */
export function LedgerPageSkeleton({ ledgerType }: { ledgerType: LedgerType }) {
  const personal = ledgerType === 'PERSONAL';
  return (
    <div className={PAGE_STACK_CLASS}>
      <div className={PAGE_HEADER_CLASS} aria-hidden>
        <div className='min-w-0'>
          <div className={EYEBROW_BOX_CLASS}>
            <div className={EYEBROW_CLASS}>
              <IconTileSkeleton size='sm' />
              <SkeletonText className='w-auto' text={personal ? 'Livro pessoal' : 'Empresa'} />
            </div>
          </div>
          <SkeletonText className={PAGE_TITLE_CLASS} width={personal ? 160 : 240} />
          {personal ? <SkeletonText className={PAGE_SUBTITLE_CLASS} text={PERSONAL_SUBTITLE} /> : <SkeletonText className={PAGE_SUBTITLE_CLASS} width='min(100%, 320px)' />}
        </div>
        <div className={PAGE_ACTIONS_CLASS}>
          <PeriodPickerSkeleton />
          <Skeleton className='size-8 shrink-0 rounded-full' />
          <ButtonSkeleton label={NEW_TRANSACTION_LABEL} icon className={NEW_TRANSACTION_CLASS} />
        </div>
      </div>
      <SegmentedControlSkeleton labels={ledgerTabs().map(tab => tab.label)} className={TABS_CLASS} />
      <LedgerSummarySkeleton ledgerType={ledgerType} />
    </div>
  );
}

/**
 * Resumo, lançamentos, contas, renda e investimentos de um livro.
 *
 * @param props - Livro carregado
 * @returns Tela do livro
 */
export function LedgerView({ ledger }: { ledger: Ledger }) {
  const period = usePeriod();
  const { open } = useQuickAdd();
  const [tab, setTab] = useState<Tab>('summary');
  const [editing, setEditing] = useState(false);
  const summary = useLedgerSummary(ledger.ledgerId, { from: period.from, to: period.to });
  const personal = ledger.type === 'PERSONAL';

  return (
    <div className={PAGE_STACK_CLASS}>
      <PageHeader
        eyebrow={
          <div className={EYEBROW_CLASS}>
            {personal ? <IconTile icon={User} size='sm' /> : <IconTile text={initials(ledger.name)} size='sm' className='text-micro' />}
            {personal ? 'Livro pessoal' : 'Empresa'}
          </div>
        }
        title={ledger.name}
        subtitle={[ledger.legalName, formatDocument(ledger.document)].filter(Boolean).join(' · ') || (personal ? PERSONAL_SUBTITLE : undefined)}
        actions={
          <>
            <PeriodPicker />
            <IconButton label={personal ? 'Editar livro' : 'Editar empresa'} onClick={() => setEditing(true)}>
              <Pencil />
            </IconButton>
            <Button icon={<Plus className='size-4' strokeWidth={2.6} />} onClick={() => open({ ledgerId: ledger.ledgerId })} className={NEW_TRANSACTION_CLASS}>
              {NEW_TRANSACTION_LABEL}
            </Button>
          </>
        }
      />

      <SegmentedControl label='Seções' className={TABS_CLASS} segments={ledgerTabs()} value={tab} onChange={setTab} />

      <AnimatePresence mode='wait' initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}>
          {tab === 'summary' &&
            (summary.isPending ? (
              <LedgerSummarySkeleton ledgerType={ledger.type} />
            ) : summary.isError ? (
              <ErrorState message={summary.error.message} onRetry={() => void summary.refetch()} />
            ) : (
              <div className={SUMMARY_STACK_CLASS}>
                <Reveal>
                  <NetWorthCard summary={summary.data} title={netWorthTitle(ledger.type)} />
                </Reveal>
                <PeriodStats summary={summary.data} ledgerType={ledger.type} />
                <Reveal index={5}>
                  <CashflowCard data={summary.data.monthly} subtitle={CASHFLOW_SUBTITLE} />
                </Reveal>
                <div className={SUMMARY_GRID_CLASS}>
                  <Reveal index={6}>
                    <IncomeByOrigin summary={summary.data} />
                  </Reveal>
                  <Reveal index={7}>
                    <ExpensesByCategory summary={summary.data} />
                  </Reveal>
                  <Reveal index={8}>
                    <Upcoming summary={summary.data} />
                  </Reveal>
                  <Reveal index={9}>
                    <Allocation summary={summary.data} />
                  </Reveal>
                </div>
              </div>
            ))}
          {tab === 'transactions' && <TransactionsPanel ledgerId={ledger.ledgerId} />}
          {tab === 'recurring' && <RecurrencesPanel ledgerId={ledger.ledgerId} />}
          {tab === 'accounts' && <AccountsPanel ledgerId={ledger.ledgerId} />}
          {tab === 'investments' && <InvestmentsPanel ledgerId={ledger.ledgerId} />}
        </motion.div>
      </AnimatePresence>

      <LedgerSheet open={editing} onOpenChange={setEditing} ledger={ledger} />
    </div>
  );
}
