/**
 * Tabela da previsão: recorrentes × meses, com entra, sai, sobra e
 * patrimônio no fim de cada mês. Grade com linhas, sem fundos coloridos, e
 * tudo clicável.
 *
 * @module components/finance/forecast/ForecastTable
 */
'use client';

import { Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatMoney, formatMonthShort } from '@/lib/format';
import type { Forecast, ForecastRow } from '@/types/entities';
import { monthNetWorth } from './forecastMath';

/** Rolagem horizontal só da tabela (no celular, a página não rola de lado). */
const SCROLL_CLASS = 'no-scrollbar overflow-x-auto';

/** Tabela. */
const TABLE_CLASS = 'w-full border-separate border-spacing-0 text-footnote';

/** Linha da grade em toda célula. */
const GRID_CELL_CLASS = 'border-r border-b border-border last:border-r-0';

/** Primeira coluna, fixa ao rolar. */
const STICKY_CELL_CLASS = 'sticky left-0 z-raised bg-surface';

/** Célula de cabeçalho de mês. */
const MONTH_HEAD_CLASS = 'min-w-[104px] p-0 text-right';

/** Célula de nome da linha. */
const NAME_CELL_CLASS = 'max-w-[220px] p-0 text-left';

/** Célula de valor. */
const VALUE_CELL_CLASS = 'p-0 text-right';

/** Botão que ocupa a célula inteira. */
const CELL_BUTTON_CLASS = 'block w-full px-3 py-2.5 text-inherit transition-colors hover:bg-fill-2 focus-visible:bg-fill-2 focus-visible:outline-none whitespace-nowrap tabular';

/** Linha de título de grupo (Receitas/Despesas): só texto, sem fundo. */
const GROUP_LABEL_CLASS = 'px-4 pt-4 pb-1.5 text-left text-caption font-semibold tracking-wide text-fg-muted uppercase';

/** Destaque do mês selecionado: sublinhado no cabeçalho, sem pintar a coluna. */
const SELECTED_HEAD_CLASS = 'text-fg underline decoration-2 underline-offset-4';

/**
 * Mês curto com ano: "dez/26".
 *
 * @param month - Mês `YYYY-MM-01`
 * @returns Rótulo curto
 */
function monthLabel(month: string): string {
  return `${formatMonthShort(month.slice(0, 7))}/${month.slice(2, 4)}`;
}

/** Ações dos cliques na tabela. */
export interface ForecastTableActions {
  /** Seleciona um mês (cabeçalho e totais). */
  onSelect: (month: string) => void;
  /** Abre um recorrente (nome ou valor da linha dele). */
  onOpenRecurrence: (recurrenceId: string) => void;
  /** Abre os lançamentos avulsos ("Outras receitas/despesas"). */
  onOpenOthers: () => void;
}

/**
 * Célula de um recorrente num mês: valor, "✓" se pago, itálico se projetado.
 *
 * @param props - Linha, mês e ação do clique
 * @returns Célula
 */
function ValueCell({ row, month, onOpen }: { row: ForecastRow; month: string; onOpen: () => void }) {
  const cell = row.cells[month];
  const label = cell
    ? `${row.description}, ${monthLabel(month)}: ${formatMoney(cell.amountCents)}${cell.paid ? ', pago' : cell.projected ? ', projeção' : ''}`
    : `${row.description}, ${monthLabel(month)}: sem valor`;
  return (
    <td className={cn(VALUE_CELL_CLASS, GRID_CELL_CLASS)}>
      <button type='button' className={cn(CELL_BUTTON_CLASS, 'text-right', cell?.projected && 'text-fg-muted italic')} onClick={onOpen} aria-label={label}>
        {cell ? (
          <span className='inline-flex items-center gap-1'>
            {cell.paid && <Check className='size-3.5' aria-hidden />}
            {formatMoney(cell.amountCents)}
          </span>
        ) : (
          <span className='sr-only'>sem valor</span>
        )}
      </button>
    </td>
  );
}

/**
 * Esqueleto da tabela: cartão do mesmo tamanho.
 *
 * @returns Tabela em esqueleto
 */
export function ForecastTableSkeleton() {
  return (
    <Card className='overflow-hidden p-0' aria-hidden>
      <Skeleton className='h-[320px] w-full rounded-none' />
    </Card>
  );
}

/**
 * Tabela da previsão.
 *
 * @param props - Previsão, selo de bens, mês selecionado e ações dos cliques
 * @returns Tabela com rolagem horizontal
 *
 * @example
 * <ForecastTable forecast={forecast} includeAssets={false} selected={selected} onSelect={setSelected} onOpenRecurrence={open} onOpenOthers={goToTransactions} />
 */
export function ForecastTable({
  forecast,
  includeAssets,
  selected,
  onSelect,
  onOpenRecurrence,
  onOpenOthers,
}: { forecast: Forecast; includeAssets: boolean; selected?: string } & ForecastTableActions) {
  const { months, rows } = forecast;
  const groups = [
    { kind: 'INCOME' as const, label: 'Receitas', rows: rows.filter(row => row.kind === 'INCOME') },
    { kind: 'EXPENSE' as const, label: 'Despesas', rows: rows.filter(row => row.kind === 'EXPENSE') },
  ].filter(group => group.rows.length > 0);
  const totals = [
    { label: 'Entra', value: (index: number) => months[index].incomeCents, signed: false },
    { label: 'Sai', value: (index: number) => months[index].expenseCents, signed: false },
    { label: 'Sobra', value: (index: number) => months[index].resultCents, signed: true },
    { label: 'Patrimônio no fim', value: (index: number) => monthNetWorth(months[index], includeAssets), signed: false },
  ];
  const openRow = (row: ForecastRow) => (row.recurrenceId ? onOpenRecurrence(row.recurrenceId) : onOpenOthers());
  return (
    <Card className='overflow-hidden p-0'>
      <div className={SCROLL_CLASS}>
        <table className={TABLE_CLASS}>
          <thead>
            <tr>
              <th className={cn(NAME_CELL_CLASS, STICKY_CELL_CLASS, GRID_CELL_CLASS, 'px-4 py-2.5 font-semibold text-fg-muted')} scope='col'>
                Mês
              </th>
              {months.map(item => (
                <th key={item.month} className={cn(MONTH_HEAD_CLASS, GRID_CELL_CLASS)} scope='col'>
                  <button
                    type='button'
                    className={cn(CELL_BUTTON_CLASS, 'text-right font-semibold text-fg-muted', selected === item.month && 'text-fg')}
                    onClick={() => onSelect(item.month)}
                    aria-pressed={selected === item.month}
                  >
                    <span className={cn(selected === item.month && SELECTED_HEAD_CLASS)}>{monthLabel(item.month)}</span>
                    <span className='block text-caption-2 font-normal text-fg-subtle'>{item.realized ? 'realizado' : 'previsto'}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <GroupRows key={group.kind} label={group.label} rows={group.rows} months={months.map(item => item.month)} onOpenRow={openRow} />
            ))}
            {totals.map(total => (
              <tr key={total.label} className='font-semibold'>
                <th className={cn(NAME_CELL_CLASS, STICKY_CELL_CLASS, GRID_CELL_CLASS, 'px-4 py-2.5')} scope='row'>
                  {total.label}
                </th>
                {months.map((item, index) => {
                  const value = total.value(index);
                  return (
                    <td key={item.month} className={cn(VALUE_CELL_CLASS, GRID_CELL_CLASS)}>
                      <button
                        type='button'
                        className={cn(CELL_BUTTON_CLASS, 'text-right')}
                        onClick={() => onSelect(item.month)}
                        aria-label={`${total.label}, ${monthLabel(item.month)}: ${formatMoney(value, { signed: total.signed })}`}
                      >
                        {formatMoney(value, { signed: total.signed })}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/**
 * Linhas de um grupo (Receitas ou Despesas), com o título do grupo em texto.
 *
 * @param props - Rótulo, linhas, meses e ação do clique
 * @returns Linhas da tabela
 */
function GroupRows({ label, rows, months, onOpenRow }: { label: string; rows: ForecastRow[]; months: string[]; onOpenRow: (row: ForecastRow) => void }) {
  return (
    <>
      <tr>
        <th className={cn(GROUP_LABEL_CLASS, STICKY_CELL_CLASS, 'border-b border-border')} scope='rowgroup'>
          {label}
        </th>
        <td colSpan={months.length} className='border-b border-border' />
      </tr>
      {rows.map(row => (
        <tr key={row.key}>
          <th className={cn(NAME_CELL_CLASS, STICKY_CELL_CLASS, GRID_CELL_CLASS, 'font-medium')} scope='row'>
            <button type='button' className={cn(CELL_BUTTON_CLASS, 'truncate px-4 text-left')} onClick={() => onOpenRow(row)} title={row.description}>
              {row.description}
              {row.ledgerName && <span className='block text-caption-2 font-normal text-fg-subtle'>{row.ledgerName}</span>}
            </button>
          </th>
          {months.map(month => (
            <ValueCell key={month} row={row} month={month} onOpen={() => onOpenRow(row)} />
          ))}
        </tr>
      ))}
    </>
  );
}
