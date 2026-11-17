/**
 * Lista de recorrentes (contratos e contas fixas) em grupo do iOS.
 *
 * @module components/finance/RecurrencesPanel
 */
'use client';

import { Plus, Repeat } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CARD_CLASS, Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { IconTile } from '@/components/ui/IconTile';
import { Money } from '@/components/ui/Money';
import { SegmentedControl, SegmentedControlSkeleton } from '@/components/ui/SegmentedControl';
import { ButtonSkeleton, IconTileSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { useRecurrences } from '@/hooks/useFinance';
import { cn } from '@/lib/cn';
import { formatDay, initials, todayIso } from '@/lib/format';
import type { Recurrence } from '@/types/entities';
import { RecurrenceSheet } from './RecurrenceSheet';

/** Receitas ou despesas. */
type RecurrenceKind = Recurrence['kind'];

/** Segmentos do painel. */
const KIND_SEGMENTS: { value: RecurrenceKind; label: string }[] = [
  { value: 'INCOME', label: 'Receitas' },
  { value: 'EXPENSE', label: 'Despesas' },
];

/** Rótulo do total mensal por tipo. */
const MONTHLY_TOTAL_LABEL: Record<RecurrenceKind, string> = { INCOME: 'Recebe por mês', EXPENSE: 'Paga por mês' };

/** Controle de receitas/despesas acima da lista. */
const SEGMENTS_CLASS = 'mb-4 w-full sm:w-72';

/** Linha do total e da ação acima da lista. */
const PANEL_BAR_CLASS = 'mb-4 flex items-center justify-between px-1';

/** Texto do total mensal. */
const PANEL_TOTAL_CLASS = 'text-subhead text-fg-muted';

/** Rótulo do botão de novo recorrente. */
const NEW_RECURRENCE_LABEL = 'Novo recorrente';

/** Recorte do cartão da lista (a moldura vem do `Card`). */
const LIST_CLASS = 'overflow-hidden';

/** Item da lista, com o fio fino recuado até depois do bloco de iniciais. */
const ROW_ITEM_CLASS = 'relative after:absolute after:right-0 after:bottom-0 after:left-[68px] after:h-px after:bg-border last:after:hidden';

/** Caixa da linha. */
const ROW_CLASS = 'flex w-full items-center gap-3 px-4 py-3.5';

/** Descrição do recorrente. */
const ROW_TITLE_CLASS = 'truncate text-body font-medium';

/** Livro, conta e próximo vencimento. */
const ROW_SUBTITLE_CLASS = 'truncate text-footnote text-fg-muted';

/** Coluna da direita: valor e dia. */
const ROW_END_CLASS = 'shrink-0 text-right';

/** Valor mensal. */
const ROW_AMOUNT_CLASS = 'text-body font-semibold';

/** "todo dia N". */
const ROW_DAY_CLASS = 'text-caption text-fg-muted';

/** Larguras da descrição e do subtítulo, alternadas entre as linhas do esqueleto. */
const SKELETON_ROW_WIDTHS = [
  ['46%', '60%'],
  ['34%', '44%'],
  ['54%', '52%'],
] as const;

/**
 * Diz se o recorrente já terminou (fim antes do mês atual).
 *
 * @param recurrence - Recorrente
 * @returns `true` quando encerrado
 */
function isEnded(recurrence: Recurrence): boolean {
  return recurrence.endMonth !== null && recurrence.endMonth.slice(0, 7) < todayIso().slice(0, 7);
}

/**
 * Quando cai: "todo dia 10" ou, com janela, "entre dia 1 e 5".
 *
 * @param recurrence - Dias do recorrente
 * @returns Rótulo do vencimento
 *
 * @example
 * dueDayLabel({ dayOfMonthStart: 1, dayOfMonth: 5 }); // 'entre dia 1 e 5'
 */
export function dueDayLabel(recurrence: Pick<Recurrence, 'dayOfMonthStart' | 'dayOfMonth'>): string {
  const { dayOfMonthStart, dayOfMonth } = recurrence;
  return dayOfMonthStart && dayOfMonthStart < dayOfMonth ? `entre dia ${dayOfMonthStart} e ${dayOfMonth}` : `todo dia ${dayOfMonth}`;
}

/**
 * Esqueleto de uma linha: bloco de iniciais, descrição, subtítulo e, à
 * direita, valor e dia.
 *
 * @param props - Posição da linha (varia as larguras)
 * @returns Linha em esqueleto
 */
function RecurrenceRowSkeleton({ index }: { index: number }) {
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
          <SkeletonText className={ROW_AMOUNT_CLASS} width={80} align='end' />
          <SkeletonText className={ROW_DAY_CLASS} width={60} align='end' />
        </div>
      </div>
    </div>
  );
}

/**
 * Esqueleto do painel de recorrentes: o controle de receitas/despesas, a
 * linha do total mensal com o botão de novo recorrente e o cartão com as linhas.
 *
 * @returns Painel em esqueleto
 *
 * @example
 * <RecurrencesPanelSkeleton />
 */
export function RecurrencesPanelSkeleton() {
  return (
    <div aria-hidden>
      <SegmentedControlSkeleton labels={KIND_SEGMENTS.map(segment => segment.label)} className={SEGMENTS_CLASS} />
      <div className={PANEL_BAR_CLASS}>
        <SkeletonText className={cn(PANEL_TOTAL_CLASS, 'w-auto')} width={180} />
        <ButtonSkeleton size='sm' label={NEW_RECURRENCE_LABEL} icon />
      </div>
      <Card className={LIST_CLASS}>
        {Array.from({ length: 3 }, (_, index) => (
          <RecurrenceRowSkeleton key={index} index={index} />
        ))}
      </Card>
    </div>
  );
}

/** Propriedades do painel. */
export interface RecurrencesPanelProps {
  ledgerId?: string;
}

/**
 * Painel de recorrentes, separado em receitas e despesas, com o total do mês
 * dos que estão em vigor. Sem `ledgerId`, cada linha mostra o livro.
 *
 * @example
 * <RecurrencesPanel ledgerId={ledgerId} />
 */
export function RecurrencesPanel({ ledgerId }: RecurrencesPanelProps) {
  const filters = ledgerId ? { 'filter.ledgerId': `$eq:${ledgerId}` } : {};
  const recurrences = useRecurrences(filters);
  const [kind, setKind] = useState<RecurrenceKind>('INCOME');
  const [editing, setEditing] = useState<Recurrence | undefined>();
  const [open, setOpen] = useState(false);

  const openSheet = (recurrence?: Recurrence) => {
    setEditing(recurrence);
    setOpen(true);
  };

  if (recurrences.isPending) return <RecurrencesPanelSkeleton />;
  if (recurrences.isError) return <ErrorState message={recurrences.error.message} onRetry={() => void recurrences.refetch()} />;

  const visible = recurrences.data.filter(recurrence => recurrence.kind === kind);
  const monthlyTotal = visible.filter(recurrence => !isEnded(recurrence)).reduce((sum, recurrence) => sum + recurrence.amountCents, 0);

  return (
    <div>
      <SegmentedControl label='Tipo de recorrente' className={SEGMENTS_CLASS} segments={KIND_SEGMENTS} value={kind} onChange={setKind} />
      {visible.length ? (
        <>
          <div className={PANEL_BAR_CLASS}>
            <p className={PANEL_TOTAL_CLASS}>
              {MONTHLY_TOTAL_LABEL[kind]}: <Money cents={monthlyTotal} className='font-semibold text-fg' />
            </p>
            <Button variant='tinted' size='sm' icon={<Plus className='size-4' />} onClick={() => openSheet()}>
              {NEW_RECURRENCE_LABEL}
            </Button>
          </div>
          <ul className={cn(LIST_CLASS, CARD_CLASS)}>
            {visible.map(recurrence => (
              <li key={recurrence.recurrenceId} className={ROW_ITEM_CLASS}>
                <button type='button' onClick={() => openSheet(recurrence)} className={cn(ROW_CLASS, 'text-left transition-colors hover:bg-fill-2')}>
                  <IconTile text={initials(recurrence.description)} />
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                      <p className={ROW_TITLE_CLASS}>{recurrence.description}</p>
                      {isEnded(recurrence) && <Badge>Encerrado</Badge>}
                    </div>
                    <p className={ROW_SUBTITLE_CLASS}>
                      {[ledgerId ? null : recurrence.ledger?.name, recurrence.account?.name, recurrence.nextDate ? `próximo ${formatDay(recurrence.nextDate)}` : null]
                        .filter((part, index, parts) => part && parts.indexOf(part) === index)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className={ROW_END_CLASS}>
                    <Money cents={recurrence.amountCents} className={ROW_AMOUNT_CLASS} />
                    <p className={ROW_DAY_CLASS}>{dueDayLabel(recurrence)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          icon={Repeat}
          title={kind === 'INCOME' ? 'Nenhuma receita recorrente' : 'Nenhuma despesa recorrente'}
          message={
            kind === 'INCOME'
              ? 'Cadastre contratos mensais e o sistema mantém os próximos meses como pendentes para você confirmar.'
              : 'Cadastre contas fixas, como aluguel e contador, e os próximos meses ficam como pendentes.'
          }
          action={
            <Button icon={<Plus className='size-4' />} onClick={() => openSheet()}>
              {NEW_RECURRENCE_LABEL}
            </Button>
          }
        />
      )}
      <RecurrenceSheet open={open} onOpenChange={setOpen} recurrence={editing} kind={kind} ledgerId={ledgerId} />
    </div>
  );
}
