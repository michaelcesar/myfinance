/**
 * Lista de lançamentos agrupada por dia, no estilo da Carteira do iPhone.
 *
 * @module components/finance/TransactionList
 */
'use client';

import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, PiggyBank } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from '@/components/ui/Badge';
import { CARD_CLASS, Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { Money } from '@/components/ui/Money';
import { IconTileSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { cn } from '@/lib/cn';
import { formatLongDay } from '@/lib/format';
import { iconFor } from '@/lib/icons';
import { TRANSFER_KIND_LABELS } from '@/lib/labels';
import type { Transaction } from '@/types/entities';

/** Pilha dos dias — a lista e o esqueleto usam a mesma. */
const DAY_STACK_CLASS = 'flex flex-col gap-4';

/** Linha do dia acima do cartão: data à esquerda, saldo do dia à direita. */
const DAY_HEADER_CLASS = 'mb-1.5 flex items-baseline justify-between px-4';

/** Data do grupo. */
const DAY_TITLE_CLASS = 'text-footnote font-semibold text-fg-muted';

/** Saldo do dia. */
const DAY_NET_CLASS = 'text-caption text-fg-subtle';

/** Recorte do cartão do dia (a moldura vem do `Card`). */
const DAY_GROUP_CLASS = 'overflow-hidden';

/** Item da lista, com o fio fino recuado até depois do ícone. */
const ROW_ITEM_CLASS = 'relative after:absolute after:right-0 after:bottom-0 after:left-[64px] after:h-px after:bg-border last:after:hidden';

/** Caixa da linha: respiro, ícone, textos e valor. */
const ROW_CLASS = 'flex w-full items-center gap-3 px-4 py-2.5';

/** Descrição do lançamento. */
const ROW_TITLE_CLASS = 'truncate text-body font-medium';

/** Linha secundária (categoria, conta, livro). */
const ROW_SUBTITLE_CLASS = 'truncate text-footnote text-fg-muted';

/** Valor à direita. */
const ROW_AMOUNT_CLASS = 'shrink-0 text-body font-semibold';

/** Linhas por dia no esqueleto: três dias, sete lançamentos. */
const SKELETON_GROUPS = [3, 2, 2] as const;

/** Larguras da descrição e da linha secundária, alternadas entre as linhas do esqueleto. */
const SKELETON_ROW_WIDTHS = [
  ['52%', '38%'],
  ['36%', '46%'],
  ['60%', '30%'],
] as const;

/** Propriedades da lista. */
export interface TransactionListProps {
  transactions: Transaction[];
  onSelect?: (transaction: Transaction) => void;
  /** Mostra o nome do livro em cada linha (útil na lista geral). */
  showLedger?: boolean;
}

/**
 * Agrupa lançamentos por data, mantendo a ordem recebida.
 *
 * @param transactions - Lançamentos já ordenados
 * @returns Pares data → lançamentos
 */
function groupByDay(transactions: Transaction[]): [string, Transaction[]][] {
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) groups.set(transaction.date, [...(groups.get(transaction.date) ?? []), transaction]);
  return [...groups.entries()];
}

/**
 * Ícone da linha: a categoria, ou um símbolo para transferência e investimento.
 *
 * @param transaction - Lançamento
 * @returns Bloco de ícone
 */
function RowIcon({ transaction }: { transaction: Transaction }) {
  if (transaction.investmentMovementId) return <IconTile icon={PiggyBank} />;
  if (transaction.transferId) return <IconTile icon={ArrowRightLeft} />;
  if (transaction.category) return <IconTile icon={iconFor(transaction.category.icon)} />;
  return <IconTile icon={transaction.kind === 'INCOME' ? ArrowDownLeft : ArrowUpRight} />;
}

/**
 * Linha secundária: conta, categoria/fonte e livro.
 *
 * @param props - Lançamento e se mostra o livro
 * @returns Texto curto
 */
function subtitle(transaction: Transaction, showLedger: boolean): string {
  const parts: string[] = [];
  if (transaction.transfer) parts.push(TRANSFER_KIND_LABELS[transaction.transfer.kind]);
  else if (transaction.category) parts.push(transaction.category.name);
  parts.push(transaction.account?.name);
  if (showLedger && transaction.ledger) parts.push(transaction.ledger.name);
  return parts.filter(Boolean).join(' · ');
}

/**
 * Lista agrupada; cada dia é um cartão com linhas separadas por fio fino
 * recuado, como as listas agrupadas do iOS.
 *
 * @example
 * <TransactionList transactions={page.data} onSelect={edit} showLedger />
 */
export function TransactionList({ transactions, onSelect, showLedger = false }: TransactionListProps) {
  return (
    <div className={DAY_STACK_CLASS}>
      {groupByDay(transactions).map(([day, items]) => {
        const net = items.reduce((sum, item) => sum + (item.kind === 'INCOME' ? item.amountCents : item.kind === 'EXPENSE' ? -item.amountCents : 0), 0);
        return (
          <section key={day}>
            <div className={DAY_HEADER_CLASS}>
              <h3 className={DAY_TITLE_CLASS}>{formatLongDay(day)}</h3>
              {net !== 0 && <Money cents={net} signed className={DAY_NET_CLASS} />}
            </div>
            <ul className={cn(DAY_GROUP_CLASS, CARD_CLASS)}>
              <AnimatePresence initial={false}>
                {items.map(transaction => {
                  const positive = transaction.kind === 'INCOME' || transaction.kind === 'TRANSFER_IN';
                  const isMove = transaction.kind === 'TRANSFER_IN' || transaction.kind === 'TRANSFER_OUT';
                  return (
                    <motion.li
                      key={transaction.transactionId}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className={ROW_ITEM_CLASS}
                    >
                      <button
                        type='button'
                        onClick={() => onSelect?.(transaction)}
                        disabled={!onSelect || !!transaction.investmentMovementId}
                        className={cn(ROW_CLASS, 'text-left transition-colors hover:bg-fill-2 disabled:hover:bg-transparent')}
                      >
                        <RowIcon transaction={transaction} />
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2'>
                            <p className={ROW_TITLE_CLASS}>{transaction.description}</p>
                            {transaction.status === 'PENDING' && <Badge tone='warning'>Pendente</Badge>}
                            {transaction.recurrenceId && <Badge>Recorrente</Badge>}
                          </div>
                          <p className={ROW_SUBTITLE_CLASS}>{subtitle(transaction, showLedger)}</p>
                        </div>
                        <Money
                          cents={positive ? transaction.amountCents : -transaction.amountCents}
                          signed
                          className={cn(ROW_AMOUNT_CLASS, isMove ? 'text-fg-muted' : positive ? 'text-success' : 'text-fg', transaction.status === 'PENDING' && 'opacity-60')}
                        />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Esqueleto de uma linha: mesma caixa, bloco do ícone, descrição, linha
 * secundária e valor à direita.
 *
 * @param props - Posição da linha (varia as larguras)
 * @returns Linha em esqueleto
 */
function TransactionRowSkeleton({ index }: { index: number }) {
  const [titleWidth, subtitleWidth] = SKELETON_ROW_WIDTHS[index % SKELETON_ROW_WIDTHS.length];
  return (
    <div className={ROW_ITEM_CLASS}>
      <div className={ROW_CLASS}>
        <IconTileSkeleton />
        <div className='min-w-0 flex-1'>
          <SkeletonText className={ROW_TITLE_CLASS} width={titleWidth} />
          <SkeletonText className={ROW_SUBTITLE_CLASS} width={subtitleWidth} />
        </div>
        <SkeletonText className={cn(ROW_AMOUNT_CLASS, 'w-auto')} width={index % 2 ? 64 : 80} align='end' />
      </div>
    </div>
  );
}

/**
 * Esqueleto da lista agrupada: três dias, cada um com a linha da data e o
 * cartão com as linhas — as mesmas caixas da lista real.
 *
 * @returns Lista em esqueleto
 *
 * @example
 * {query.isPending ? <TransactionListSkeleton /> : <TransactionList transactions={items} />}
 */
export function TransactionListSkeleton() {
  return (
    <div className={DAY_STACK_CLASS} aria-hidden>
      {SKELETON_GROUPS.map((count, group) => {
        const offset = SKELETON_GROUPS.slice(0, group).reduce((sum, size) => sum + size, 0);
        return (
          <section key={group}>
            <div className={DAY_HEADER_CLASS}>
              <SkeletonText className={cn(DAY_TITLE_CLASS, 'w-auto')} width={group === 0 ? 112 : 176} />
              <SkeletonText className={cn(DAY_NET_CLASS, 'w-auto')} width={64} align='end' />
            </div>
            <Card className={DAY_GROUP_CLASS}>
              {Array.from({ length: count }, (_, position) => (
                <TransactionRowSkeleton key={position} index={offset + position} />
              ))}
            </Card>
          </section>
        );
      })}
    </div>
  );
}
