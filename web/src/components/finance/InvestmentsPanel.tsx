/**
 * Carteira de investimentos com detalhe e movimentações.
 *
 * @module components/finance/InvestmentsPanel
 */
'use client';

import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Sparkles, Trash2, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CARD_CLASS, Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile } from '@/components/ui/IconTile';
import { Money } from '@/components/ui/Money';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { ButtonSkeleton, IconTileSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { useFinanceMutation, useInvestmentMovements, useInvestments } from '@/hooks/useFinance';
import { cn } from '@/lib/cn';
import { formatDay, formatPercent } from '@/lib/format';
import { INVESTMENT_TYPE_LABELS, MOVEMENT_KIND_LABELS } from '@/lib/labels';
import { investmentsService } from '@/services/finance.service';
import type { Investment, MovementKind } from '@/types/entities';
import { InvestmentSheet, MovementSheet } from './InvestmentSheet';

const MOVEMENT_ICONS = { CONTRIBUTION: ArrowDownLeft, WITHDRAWAL: ArrowUpRight, YIELD: Sparkles } as const;

/** Linha do total da carteira e da ação acima da lista. */
const PANEL_BAR_CLASS = 'mb-4 flex flex-wrap items-center justify-between gap-2 px-1';

/** Texto do total da carteira. */
const PANEL_TOTAL_CLASS = 'text-subhead text-fg-muted';

/** Rótulo do botão de novo investimento. */
const NEW_INVESTMENT_LABEL = 'Novo investimento';

/** Recorte do cartão da lista (a moldura vem do `Card`). */
const LIST_CLASS = 'overflow-hidden';

/** Item da lista, com o fio fino recuado até depois do ícone. */
const ROW_ITEM_CLASS = 'relative after:absolute after:right-0 after:bottom-0 after:left-[68px] after:h-px after:bg-border last:after:hidden';

/** Caixa da linha. */
const ROW_CLASS = 'flex w-full items-center gap-3 px-4 py-3.5';

/** Nome do ativo. */
const ROW_TITLE_CLASS = 'truncate text-body font-medium';

/** Tipo, instituição e livro. */
const ROW_SUBTITLE_CLASS = 'truncate text-footnote text-fg-muted';

/** Coluna da direita: valor atual e retorno. */
const ROW_END_CLASS = 'shrink-0 text-right';

/** Valor atual. */
const ROW_AMOUNT_CLASS = 'text-body font-semibold';

/** Retorno percentual. */
const ROW_RATIO_CLASS = 'tabular text-caption font-medium';

/** Larguras do nome e do detalhe, alternadas entre as linhas do esqueleto. */
const SKELETON_ROW_WIDTHS = [
  ['46%', '34%'],
  ['34%', '50%'],
  ['56%', '28%'],
] as const;

/** Lista de movimentações na folha de detalhe. */
const MOVEMENT_LIST_CLASS = 'divide-y divide-border overflow-hidden rounded-xl bg-fill-2';

/** Linha de movimentação. */
const MOVEMENT_ROW_CLASS = 'flex items-center gap-3 px-3.5 py-2.5';

/** Ícone do tipo de movimentação. */
const MOVEMENT_ICON_CLASS = 'size-4';

/** Tipo da movimentação. */
const MOVEMENT_TITLE_CLASS = 'text-subhead font-medium';

/** Data e conta da movimentação. */
const MOVEMENT_DETAIL_CLASS = 'truncate text-caption text-fg-muted';

/** Valor da movimentação. */
const MOVEMENT_AMOUNT_CLASS = 'text-subhead font-semibold';

/**
 * Esqueleto das movimentações na folha de detalhe: a mesma lista, com ícone,
 * tipo, data, valor e o botão de apagar trocados por blocos.
 *
 * @returns Lista em esqueleto
 */
function MovementListSkeleton() {
  return (
    <div className={MOVEMENT_LIST_CLASS} aria-hidden>
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className={MOVEMENT_ROW_CLASS}>
          <Skeleton className={cn(MOVEMENT_ICON_CLASS, 'rounded-full')} />
          <div className='min-w-0 flex-1'>
            <SkeletonText className={MOVEMENT_TITLE_CLASS} width={index ? 72 : 56} />
            <SkeletonText className={MOVEMENT_DETAIL_CLASS} width='45%' />
          </div>
          <SkeletonText className={cn(MOVEMENT_AMOUNT_CLASS, 'w-auto')} width={80} align='end' />
          <Skeleton className='size-8 rounded-full' />
        </div>
      ))}
    </div>
  );
}

/**
 * Esqueleto de uma linha de ativo: ícone, nome, detalhe e, à direita, valor
 * atual e retorno.
 *
 * @param props - Posição da linha (varia as larguras)
 * @returns Linha em esqueleto
 */
function InvestmentRowSkeleton({ index }: { index: number }) {
  const [titleWidth, subtitleWidth] = SKELETON_ROW_WIDTHS[index % SKELETON_ROW_WIDTHS.length];
  return (
    <div className={ROW_ITEM_CLASS}>
      <div className={ROW_CLASS}>
        <IconTileSkeleton />
        <div className='min-w-0 flex-1'>
          <SkeletonText className={ROW_TITLE_CLASS} width={titleWidth} />
          <SkeletonText className={ROW_SUBTITLE_CLASS} width={subtitleWidth} />
        </div>
        <div className={ROW_END_CLASS}>
          <SkeletonText className={ROW_AMOUNT_CLASS} width={88} align='end' />
          <SkeletonText className={ROW_RATIO_CLASS} width={48} align='end' />
        </div>
      </div>
    </div>
  );
}

/**
 * Esqueleto do painel de investimentos: a linha da carteira com o botão de
 * novo investimento e o cartão com as linhas dos ativos.
 *
 * @returns Painel em esqueleto
 *
 * @example
 * <InvestmentsPanelSkeleton />
 */
export function InvestmentsPanelSkeleton() {
  return (
    <div aria-hidden>
      <div className={PANEL_BAR_CLASS}>
        <SkeletonText className={cn(PANEL_TOTAL_CLASS, 'w-auto')} width={280} />
        <ButtonSkeleton size='sm' label={NEW_INVESTMENT_LABEL} icon />
      </div>
      <Card className={LIST_CLASS}>
        {Array.from({ length: 3 }, (_, index) => (
          <InvestmentRowSkeleton key={index} index={index} />
        ))}
      </Card>
    </div>
  );
}

/**
 * Retorno percentual sobre o investido.
 *
 * @param investment - Ativo
 * @returns Fração, ou `null` sem valor investido
 */
function returnRatio(investment: Investment): number | null {
  return investment.investedCents > 0 ? investment.returnCents / investment.investedCents : null;
}

/**
 * Folha de detalhe: números, ações e histórico de movimentações.
 *
 * @param props - Ativo, controle de abertura e ações
 * @returns Folha
 */
function InvestmentDetail({
  investment,
  open,
  onOpenChange,
  onEdit,
  onMove,
}: {
  investment?: Investment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onMove: (kind: MovementKind) => void;
}) {
  const movements = useInvestmentMovements(open ? investment?.investmentId : undefined);
  const removeMovement = useFinanceMutation((movementId: string) => investmentsService.removeMovement(investment!.investmentId, movementId), 'Movimentação apagada.');
  const ratio = investment ? returnRatio(investment) : null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={investment?.name ?? ''}
      description={investment ? `${INVESTMENT_TYPE_LABELS[investment.type]}${investment.institution ? ` · ${investment.institution}` : ''}` : undefined}
      size='lg'
    >
      {investment && (
        <div className='flex flex-col gap-4'>
          <div className='grid grid-cols-3 gap-3'>
            <div className='rounded-xl bg-fill-2 p-3'>
              <p className='text-caption text-fg-muted'>Valor atual</p>
              <Money cents={investment.currentValueCents} className='text-headline font-bold' />
            </div>
            <div className='rounded-xl bg-fill-2 p-3'>
              <p className='text-caption text-fg-muted'>{investment.type === 'ASSET' ? 'Pago' : 'Investido'}</p>
              <Money cents={investment.investedCents} className='text-headline font-bold' />
            </div>
            <div className='rounded-xl bg-fill-2 p-3'>
              <p className='text-caption text-fg-muted'>{investment.type === 'ASSET' ? (investment.returnCents < 0 ? 'Perda' : 'Ganho') : 'Retorno'}</p>
              <Money cents={investment.returnCents} signed tone='auto' className='text-headline font-bold' />
              {ratio !== null && <p className={cn('text-caption font-medium', ratio >= 0 ? 'text-success' : 'text-error')}>{formatPercent(ratio)}</p>}
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button size='sm' icon={<ArrowDownLeft className='size-4' />} onClick={() => onMove('CONTRIBUTION')}>
              Aporte
            </Button>
            <Button size='sm' variant='tinted' icon={<ArrowUpRight className='size-4' />} onClick={() => onMove('WITHDRAWAL')}>
              Resgate
            </Button>
            {investment.type !== 'ASSET' && (
              <Button size='sm' variant='tinted' icon={<Sparkles className='size-4' />} onClick={() => onMove('YIELD')}>
                Rendimento
              </Button>
            )}
            <div className='flex-1' />
            <Button size='sm' variant='secondary' icon={<Pencil className='size-4' />} onClick={onEdit}>
              Editar / atualizar valor
            </Button>
          </div>
          <div>
            <h3 className='mb-2 px-1 text-footnote font-semibold text-fg-muted'>Movimentações</h3>
            {movements.isPending ? (
              <MovementListSkeleton />
            ) : movements.data?.length ? (
              <ul className={MOVEMENT_LIST_CLASS}>
                {movements.data.map(movement => {
                  const Icon = MOVEMENT_ICONS[movement.kind];
                  return (
                    <li key={movement.investmentMovementId} className={MOVEMENT_ROW_CLASS}>
                      <Icon className={cn(MOVEMENT_ICON_CLASS, movement.kind === 'WITHDRAWAL' ? 'text-fg-muted' : 'text-success')} />
                      <div className='min-w-0 flex-1'>
                        <p className={MOVEMENT_TITLE_CLASS}>{MOVEMENT_KIND_LABELS[movement.kind]}</p>
                        <p className={MOVEMENT_DETAIL_CLASS}>
                          {formatDay(movement.date)}
                          {movement.account && ` · ${movement.account.name}`}
                        </p>
                      </div>
                      <Money cents={movement.kind === 'WITHDRAWAL' ? -movement.amountCents : movement.amountCents} signed className={MOVEMENT_AMOUNT_CLASS} />
                      <IconButton label='Apagar movimentação' tone='plain' onClick={() => removeMovement.mutate(movement.investmentMovementId)}>
                        <Trash2 />
                      </IconButton>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className='rounded-xl bg-fill-2 px-4 py-6 text-center text-subhead text-fg-muted'>Nenhuma movimentação ainda.</p>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/**
 * Painel da carteira de um livro, ou de todos.
 *
 * @param props - Livro (opcional)
 * @returns Lista de ativos com totais
 */
export function InvestmentsPanel({ ledgerId }: { ledgerId?: string }) {
  const investments = useInvestments(ledgerId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | undefined>();
  const [movement, setMovement] = useState<{ open: boolean; kind?: MovementKind }>({ open: false });

  if (investments.isPending) return <InvestmentsPanelSkeleton />;
  if (investments.isError) return <ErrorState message={investments.error.message} onRetry={() => void investments.refetch()} />;

  const selected = investments.data.find(item => item.investmentId === selectedId);
  const totalValue = investments.data.reduce((sum, item) => sum + item.currentValueCents, 0);
  const totalReturn = investments.data.reduce((sum, item) => sum + item.returnCents, 0);

  return (
    <div>
      {investments.data.length ? (
        <>
          <div className={PANEL_BAR_CLASS}>
            <p className={PANEL_TOTAL_CLASS}>
              Carteira: <Money cents={totalValue} className='font-semibold text-fg' /> · retorno <Money cents={totalReturn} signed tone='auto' className='font-semibold' />
            </p>
            <Button
              variant='tinted'
              size='sm'
              icon={<Plus className='size-4' />}
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              {NEW_INVESTMENT_LABEL}
            </Button>
          </div>
          <ul className={cn(LIST_CLASS, CARD_CLASS)}>
            {investments.data.map(investment => {
              const ratio = returnRatio(investment);
              return (
                <li key={investment.investmentId} className={ROW_ITEM_CLASS}>
                  <button
                    type='button'
                    onClick={() => {
                      setSelectedId(investment.investmentId);
                      setDetailOpen(true);
                    }}
                    className={cn(ROW_CLASS, 'text-left transition-colors hover:bg-fill-2')}
                  >
                    <IconTile icon={TrendingUp} />
                    <div className='min-w-0 flex-1'>
                      <p className={ROW_TITLE_CLASS}>{investment.name}</p>
                      <p className={ROW_SUBTITLE_CLASS}>
                        {INVESTMENT_TYPE_LABELS[investment.type]}
                        {investment.institution && ` · ${investment.institution}`}
                        {!ledgerId && investment.ledger && ` · ${investment.ledger.name}`}
                      </p>
                    </div>
                    <div className={ROW_END_CLASS}>
                      <Money cents={investment.currentValueCents} className={ROW_AMOUNT_CLASS} />
                      {ratio !== null && (
                        <p className={cn(ROW_RATIO_CLASS, ratio >= 0 ? 'text-success' : 'text-error')}>
                          {ratio >= 0 ? '+' : ''}
                          {formatPercent(ratio)}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <EmptyState
          icon={TrendingUp}
          title='Nenhum investimento'
          message='Registre renda fixa, ações, fundos e cripto para acompanhar a carteira e o retorno.'
          action={
            <Button icon={<Plus className='size-4' />} onClick={() => setFormOpen(true)}>
              Novo investimento
            </Button>
          }
        />
      )}
      <InvestmentDetail
        investment={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => {
          setEditing(selected);
          setDetailOpen(false);
          setFormOpen(true);
        }}
        onMove={kind => setMovement({ open: true, kind })}
      />
      <InvestmentSheet open={formOpen} onOpenChange={setFormOpen} investment={editing} ledgerId={ledgerId} />
      <MovementSheet open={movement.open} onOpenChange={open => setMovement(current => ({ ...current, open }))} investment={selected} initialKind={movement.kind} />
    </div>
  );
}
