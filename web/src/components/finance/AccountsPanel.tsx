/**
 * Grade de contas com saldo, como os cartões da Carteira.
 *
 * @module components/finance/AccountsPanel
 */
'use client';

import { Banknote, Building, CreditCard, LineChart, type LucideIcon, Plus, PiggyBank, Smartphone, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import { ButtonSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { useAccounts, useLedgers } from '@/hooks/useFinance';
import { cn } from '@/lib/cn';
import { ACCOUNT_TYPE_LABELS } from '@/lib/labels';
import { palette } from '@/lib/palette';
import type { Account, AccountType } from '@/types/entities';
import { AccountSheet } from './AccountSheet';

/** Ícone por tipo de conta. */
export const ACCOUNT_ICONS: Record<AccountType, LucideIcon> = {
  CHECKING: Building,
  SAVINGS: PiggyBank,
  DIGITAL_WALLET: Smartphone,
  CASH: Banknote,
  CREDIT_CARD: CreditCard,
  BROKERAGE: LineChart,
};

/** Grade dos cartões — o painel e o esqueleto usam a mesma. */
const ACCOUNTS_GRID_CLASS = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

/** Caixa do cartão de conta: proporção, raio e respiro. */
const ACCOUNT_CARD_CLASS = 'relative flex aspect-[1.7] w-full flex-col justify-between overflow-hidden rounded-2xl p-4';

/** Superfície grafite do cartão. */
const ACCOUNT_CARD_SURFACE_CLASS = 'bg-linear-135 from-inverted-2 to-inverted text-inverted-fg shadow-card';

/** Linha de cima do cartão: nome e detalhe à esquerda, ícone do tipo à direita. */
const ACCOUNT_TOP_CLASS = 'flex items-start justify-between';

/** Nome da conta. */
const ACCOUNT_NAME_CLASS = 'truncate text-body font-semibold';

/** Instituição e livro. */
const ACCOUNT_DETAIL_CLASS = 'truncate text-caption text-inverted-muted';

/** Ícone do tipo de conta. */
const ACCOUNT_ICON_CLASS = 'size-5 shrink-0';

/** Rótulo acima do saldo ("Saldo" ou "Fatura"). */
const ACCOUNT_BALANCE_LABEL_CLASS = 'text-caption-2 font-medium text-inverted-muted uppercase';

/** Rendimento estimado, abaixo do saldo. */
const ACCOUNT_YIELD_CLASS = 'mt-0.5 text-caption text-inverted-muted';

/** Saldo grande. */
const ACCOUNT_BALANCE_CLASS = 'font-display text-title-2 font-bold tracking-[-0.02em]';

/** Barras do esqueleto em claro translúcido, visíveis sobre o grafite. */
const ACCOUNT_SKELETON_FILL_CLASS = '[--color-fill:color-mix(in_oklab,var(--color-inverted-fg)_16%,transparent)]';

/** Linha do total e da ação acima da grade. */
const PANEL_BAR_CLASS = 'mb-4 flex items-center justify-between px-1';

/** Texto do total. */
const PANEL_TOTAL_CLASS = 'text-subhead text-fg-muted';

/** Rótulo do botão de nova conta. */
const NEW_ACCOUNT_LABEL = 'Nova conta';

/**
 * Cartão de conta: gradiente na cor escolhida, saldo grande embaixo.
 *
 * @param props - Conta, nome do livro e clique
 * @returns Botão em forma de cartão
 */
function AccountCard({ account, ledgerName, onClick }: { account: Account; ledgerName?: string; onClick: () => void }) {
  const Icon = ACCOUNT_ICONS[account.type];
  const color = palette(account.color).cssVar;
  return (
    <motion.button
      type='button'
      onClick={onClick}
      layout
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(ACCOUNT_CARD_CLASS, ACCOUNT_CARD_SURFACE_CLASS, 'text-left')}
    >
      <div className={ACCOUNT_TOP_CLASS}>
        <div className='min-w-0'>
          <p className={cn('flex items-center gap-1.5', ACCOUNT_NAME_CLASS)}>
            <span className='size-2 shrink-0 rounded-full' style={{ background: color }} aria-hidden />
            {account.name}
          </p>
          <p className={ACCOUNT_DETAIL_CLASS}>{[account.institution, ledgerName].filter(Boolean).join(' · ') || ACCOUNT_TYPE_LABELS[account.type]}</p>
        </div>
        <Icon className={cn(ACCOUNT_ICON_CLASS, 'text-inverted-muted')} />
      </div>
      <div>
        <p className={ACCOUNT_BALANCE_LABEL_CLASS}>{account.type === 'CREDIT_CARD' ? 'Fatura' : 'Saldo'}</p>
        <Money cents={account.balanceCents} className={ACCOUNT_BALANCE_CLASS} />
        {account.estimatedMonthlyYieldCents > 0 && (
          <p className={ACCOUNT_YIELD_CLASS}>
            Rende ~<Money cents={account.estimatedMonthlyYieldCents} />
            /mês
          </p>
        )}
      </div>
      {account.archived && <span className='absolute top-3 right-10 rounded-full bg-fill-3 px-2 py-0.5 text-micro font-semibold'>Arquivada</span>}
    </motion.button>
  );
}

/**
 * Esqueleto do cartão de conta: o mesmo cartão grafite (proporção, raio,
 * respiro), com nome, detalhe, ícone, rótulo e saldo trocados por barras.
 *
 * @returns Cartão em esqueleto
 *
 * @example
 * <AccountCardSkeleton />
 */
export function AccountCardSkeleton() {
  return (
    <div className={cn(ACCOUNT_CARD_CLASS, ACCOUNT_CARD_SURFACE_CLASS, ACCOUNT_SKELETON_FILL_CLASS)} aria-hidden>
      <div className={ACCOUNT_TOP_CLASS}>
        <div className='min-w-0 flex-1'>
          <SkeletonText className={ACCOUNT_NAME_CLASS} width='55%' />
          <SkeletonText className={ACCOUNT_DETAIL_CLASS} width='40%' />
        </div>
        <Skeleton className={cn(ACCOUNT_ICON_CLASS, 'rounded-md')} />
      </div>
      <div>
        <SkeletonText className={ACCOUNT_BALANCE_LABEL_CLASS} text='Saldo' />
        <SkeletonText className={ACCOUNT_BALANCE_CLASS} width='50%' />
      </div>
    </div>
  );
}

/**
 * Esqueleto do painel de contas: a linha do saldo somado com o botão de
 * nova conta e a grade de cartões.
 *
 * @returns Painel em esqueleto
 *
 * @example
 * <AccountsPanelSkeleton />
 */
export function AccountsPanelSkeleton() {
  return (
    <div aria-hidden>
      <div className={PANEL_BAR_CLASS}>
        <SkeletonText className={cn(PANEL_TOTAL_CLASS, 'w-auto')} width={176} />
        <ButtonSkeleton size='sm' label={NEW_ACCOUNT_LABEL} icon />
      </div>
      <div className={ACCOUNTS_GRID_CLASS}>
        <AccountCardSkeleton />
        <AccountCardSkeleton />
        <AccountCardSkeleton />
      </div>
    </div>
  );
}

/**
 * Painel de contas, de um livro ou de todos.
 *
 * @param props - Livro (opcional) e se mostra arquivadas
 * @returns Grade de cartões com botão de nova conta
 */
export function AccountsPanel({ ledgerId, includeArchived = false }: { ledgerId?: string; includeArchived?: boolean }) {
  const accounts = useAccounts(ledgerId, includeArchived);
  const ledgers = useLedgers();
  const [editing, setEditing] = useState<Account | undefined>();
  const [open, setOpen] = useState(false);
  const ledgerNames = new Map((ledgers.data ?? []).map(ledger => [ledger.ledgerId, ledger.name]));

  const openSheet = (account?: Account) => {
    setEditing(account);
    setOpen(true);
  };

  if (accounts.isPending) return <AccountsPanelSkeleton />;
  if (accounts.isError) return <ErrorState message={accounts.error.message} onRetry={() => void accounts.refetch()} />;

  const total = accounts.data.filter(account => !account.archived).reduce((sum, account) => sum + account.balanceCents, 0);

  return (
    <div>
      {accounts.data.length ? (
        <>
          <div className={PANEL_BAR_CLASS}>
            <p className={PANEL_TOTAL_CLASS}>
              Saldo somado: <Money cents={total} className='font-semibold text-fg' />
            </p>
            <Button variant='tinted' size='sm' icon={<Plus className='size-4' />} onClick={() => openSheet()}>
              {NEW_ACCOUNT_LABEL}
            </Button>
          </div>
          <div className={ACCOUNTS_GRID_CLASS}>
            {accounts.data.map(account => (
              <AccountCard key={account.accountId} account={account} ledgerName={ledgerId ? undefined : ledgerNames.get(account.ledgerId)} onClick={() => openSheet(account)} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={Wallet}
          title='Nenhuma conta ainda'
          message='Cadastre onde o dinheiro fica: banco, carteira, cartão ou corretora.'
          action={
            <Button icon={<Plus className='size-4' />} onClick={() => openSheet()}>
              Nova conta
            </Button>
          }
        />
      )}
      <AccountSheet open={open} onOpenChange={setOpen} account={editing} ledgerId={ledgerId} />
    </div>
  );
}
