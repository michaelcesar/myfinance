/**
 * KPIs da previsão e atalhos de período — funções puras, sem React.
 *
 * @module components/finance/forecast/forecastMath
 */
import type { Forecast, ForecastMonth } from '@/types/entities';

/** Maior período aceito pela API, em meses. */
export const MAX_PERIOD_MONTHS = 60;

/** Variação do patrimônio, em fração, até a qual a situação é "estável". */
export const STABLE_BAND = 0.01;

/** Situação do patrimônio no período. */
export type GrowthStatus = 'GROWING' | 'STABLE' | 'SHRINKING';

/** Atalhos de período da tela. */
export type PeriodPreset = 'around' | 'thisMonth' | 'next3' | 'next6' | 'next12' | 'last12' | 'thisYear' | 'nextYear' | 'custom';

/** Intervalo de meses (`YYYY-MM`). */
export interface MonthRange {
  from: string;
  to: string;
}

/** Entradas, saídas e sobra de uma parte do período. */
export interface FlowTotals {
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
}

/** KPIs calculados a partir da previsão. */
export interface ForecastKpis {
  /** Primeiro mês do período (`YYYY-MM-01`), base da variação do patrimônio. */
  periodStartMonth: string | null;
  /** O que já aconteceu (meses passados). */
  realized: FlowTotals;
  /** O que é estimativa (mês atual em diante). */
  forecast: FlowTotals;
  status: GrowthStatus;
  netWorthTodayCents: number;
  netWorthEndCents: number;
  netWorthChangeCents: number;
  netWorthChangeRatio: number | null;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
  marginRatio: number | null;
  averageResultCents: number;
  tightestMonth: { month: string; cashEndCents: number } | null;
  selected: { month: string; resultCents: number; netWorthEndCents: number } | null;
}

/**
 * Soma meses a um mês `YYYY-MM`.
 *
 * @param month - Mês `YYYY-MM`
 * @param count - Meses a somar (negativo volta)
 * @returns Mês `YYYY-MM`
 */
function shiftMonth(month: string, count: number): string {
  const [year, index] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, index - 1 + count, 1));
  return date.toISOString().slice(0, 7);
}

/**
 * Intervalo de meses de um atalho de período.
 *
 * @param preset - Atalho escolhido
 * @param current - Mês atual (`YYYY-MM`)
 * @param custom - Intervalo do "Personalizado"
 * @returns Mês inicial e final
 *
 * @example
 * periodRange('next12', '2026-11'); // { from: '2026-11', to: '2027-10' }
 */
export function periodRange(preset: PeriodPreset, current: string, custom?: MonthRange): MonthRange {
  const year = Number(current.slice(0, 4));
  switch (preset) {
    case 'thisMonth':
      return { from: current, to: current };
    case 'next3':
      return { from: current, to: shiftMonth(current, 2) };
    case 'next6':
      return { from: current, to: shiftMonth(current, 5) };
    case 'next12':
      return { from: current, to: shiftMonth(current, 11) };
    case 'last12':
      return { from: shiftMonth(current, -11), to: current };
    case 'thisYear':
      return { from: `${year}-01`, to: `${year}-12` };
    case 'nextYear':
      return { from: `${year + 1}-01`, to: `${year + 1}-12` };
    case 'custom': {
      if (!custom) return { from: current, to: shiftMonth(current, 11) };
      const from = custom.from <= custom.to ? custom.from : custom.to;
      const to = custom.from <= custom.to ? custom.to : custom.from;
      const limit = shiftMonth(from, MAX_PERIOD_MONTHS - 1);
      return { from, to: to > limit ? limit : to };
    }
    default:
      return { from: shiftMonth(current, -11), to: shiftMonth(current, 12) };
  }
}

/**
 * Patrimônio no fim de um mês, com ou sem bens.
 *
 * @param month - Mês da previsão
 * @param includeAssets - Selo "Incluir bens" ligado
 * @returns Patrimônio em centavos
 */
export function monthNetWorth(month: ForecastMonth, includeAssets: boolean): number {
  return month.cashEndCents + month.investmentsEndCents + (includeAssets ? month.assetsEndCents : 0);
}

/**
 * KPIs do período: situação, patrimônio, entradas, saídas, sobra, mês mais
 * apertado e mês selecionado. Bens só entram com `includeAssets`.
 *
 * @param forecast - Previsão devolvida pela API
 * @param options - Mês selecionado (padrão: o último) e selo de bens
 * @returns KPIs prontos para a tela
 *
 * @example
 * forecastKpis(forecast, { includeAssets: false }).status; // 'GROWING'
 */
export function forecastKpis(forecast: Forecast, options: { selectedMonth?: string; includeAssets: boolean }): ForecastKpis {
  const { months } = forecast;
  const { includeAssets } = options;
  const incomeCents = months.reduce((sum, item) => sum + item.incomeCents, 0);
  const expenseCents = months.reduce((sum, item) => sum + item.expenseCents, 0);
  const resultCents = incomeCents - expenseCents;
  const first = months[0];
  const last = months[months.length - 1];
  const startCents = first ? monthNetWorth(first, includeAssets) - first.resultCents - first.yieldCents : 0;
  const netWorthEndCents = last ? monthNetWorth(last, includeAssets) : 0;
  const netWorthChangeCents = netWorthEndCents - startCents;
  const netWorthChangeRatio = startCents !== 0 ? netWorthChangeCents / Math.abs(startCents) : null;
  const status: GrowthStatus =
    netWorthChangeRatio === null
      ? netWorthChangeCents > 0
        ? 'GROWING'
        : netWorthChangeCents < 0
          ? 'SHRINKING'
          : 'STABLE'
      : netWorthChangeRatio > STABLE_BAND
        ? 'GROWING'
        : netWorthChangeRatio < -STABLE_BAND
          ? 'SHRINKING'
          : 'STABLE';
  const candidates = months.filter(item => !item.realized);
  const pool = candidates.length ? candidates : months;
  const tightest = pool.reduce<ForecastMonth | null>((lowest, item) => (lowest === null || item.cashEndCents < lowest.cashEndCents ? item : lowest), null);
  const selectedMonth = months.find(item => item.month === options.selectedMonth) ?? last;
  const totalsOf = (items: ForecastMonth[]): FlowTotals => {
    const income = items.reduce((sum, item) => sum + item.incomeCents, 0);
    const expense = items.reduce((sum, item) => sum + item.expenseCents, 0);
    return { incomeCents: income, expenseCents: expense, resultCents: income - expense };
  };
  return {
    periodStartMonth: first?.month ?? null,
    realized: totalsOf(months.filter(item => item.realized)),
    forecast: totalsOf(months.filter(item => !item.realized)),
    status,
    netWorthTodayCents: forecast.cashTodayCents + forecast.investmentsCents + (includeAssets ? forecast.assetsCents : 0),
    netWorthEndCents,
    netWorthChangeCents,
    netWorthChangeRatio,
    incomeCents,
    expenseCents,
    resultCents,
    marginRatio: incomeCents > 0 ? resultCents / incomeCents : null,
    averageResultCents: months.length ? Math.round(resultCents / months.length) : 0,
    tightestMonth: tightest ? { month: tightest.month, cashEndCents: tightest.cashEndCents } : null,
    selected: selectedMonth ? { month: selectedMonth.month, resultCents: selectedMonth.resultCents, netWorthEndCents: monthNetWorth(selectedMonth, includeAssets) } : null,
  };
}

/**
 * Média mensal do que os recorrentes trazem e custam no período (pagos,
 * pendentes e projetados), dividida por todos os meses do período. Avulsos
 * ficam de fora.
 *
 * @param forecast - Previsão devolvida pela API
 * @returns Receita recorrente e custo fixo médios por mês, em centavos
 *
 * @example
 * recurringAverages(forecast); // { incomeCents: 380000, expenseCents: 50000 }
 */
export function recurringAverages(forecast: Forecast): { incomeCents: number; expenseCents: number } {
  const count = forecast.months.length;
  if (!count) return { incomeCents: 0, expenseCents: 0 };
  const total = (kind: 'INCOME' | 'EXPENSE') =>
    forecast.rows.filter(row => row.recurrenceId !== null && row.kind === kind).reduce((sum, row) => sum + Object.values(row.cells).reduce((cells, cell) => cells + cell.amountCents, 0), 0);
  return { incomeCents: Math.round(total('INCOME') / count), expenseCents: Math.round(total('EXPENSE') / count) };
}
