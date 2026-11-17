/**
 * Matemática de meses dos recorrentes.
 *
 * Mês é sempre `YYYY-MM-01` e data é `YYYY-MM-DD`. "Hoje" e "mês atual" são
 * calculados no fuso de São Paulo, para o servidor em UTC (Docker) não virar
 * o mês horas antes do dono.
 *
 * @module modules/recurrences/recurrence-months
 */

/** Meses gerados além do atual. */
export const RECURRENCE_HORIZON_MONTHS = 2;

/** Fuso do dono. */
export const RECURRENCE_TIME_ZONE = 'America/Sao_Paulo';

const LOCAL_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: RECURRENCE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/**
 * Data de hoje em São Paulo.
 *
 * @param now - Instante de referência
 * @returns Data `YYYY-MM-DD`
 *
 * @example
 * todayIso(new Date('2026-12-01T01:30:00Z')); // '2026-11-30'
 */
export function todayIso(now: Date = new Date()): string {
  return LOCAL_DATE.format(now);
}

/**
 * Mês corrente em São Paulo.
 *
 * @param now - Instante de referência
 * @returns Mês `YYYY-MM-01`
 *
 * @example
 * currentMonth(new Date('2026-11-17T15:00:00Z')); // '2026-11-01'
 */
export function currentMonth(now: Date = new Date()): string {
  return toMonth(todayIso(now));
}

/**
 * Reduz uma data ao primeiro dia do mês.
 *
 * @param isoDate - Data `YYYY-MM-DD`
 * @returns Mês `YYYY-MM-01`
 *
 * @example
 * toMonth('2026-11-17'); // '2026-11-01'
 */
export function toMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

/**
 * Soma meses a um mês.
 *
 * @param month - Mês `YYYY-MM-01`
 * @param count - Meses a somar (negativo volta)
 * @returns Mês resultante
 *
 * @example
 * addMonths('2026-11-01', 3); // '2027-02-01'
 */
export function addMonths(month: string, count: number): string {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + count, 1));
  return date.toISOString().slice(0, 10);
}

/**
 * Data de vencimento no mês, com o dia limitado ao último dia dele.
 *
 * @param month - Mês `YYYY-MM-01`
 * @param dayOfMonth - Dia do vencimento (1–31)
 * @returns Data `YYYY-MM-DD`
 *
 * @example
 * dueDate('2027-02-01', 31); // '2027-02-28'
 */
export function dueDate(month: string, dayOfMonth: number): string {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return `${month.slice(0, 8)}${String(Math.min(dayOfMonth, lastDay)).padStart(2, '0')}`;
}

/**
 * Meses que o gerador mantém criados: do maior entre o início e o mês atual
 * até o menor entre o horizonte e o fim. Meses passados nunca entram.
 *
 * @param startMonth - Início do contrato
 * @param endMonth - Fim do contrato (inclusive), ou `null`
 * @param now - Instante de referência
 * @returns Meses em ordem, possivelmente vazio
 *
 * @example
 * generationWindow('2026-01-01', null, new Date('2026-11-17T15:00:00Z')); // ['2026-11-01', '2026-12-01', '2027-01-01']
 */
export function generationWindow(startMonth: string, endMonth: string | null, now: Date = new Date()): string[] {
  const current = currentMonth(now);
  const horizon = addMonths(current, RECURRENCE_HORIZON_MONTHS);
  const first = startMonth > current ? startMonth : current;
  const last = endMonth !== null && endMonth < horizon ? endMonth : horizon;
  const months: string[] = [];
  for (let month = first; month <= last; month = addMonths(month, 1)) months.push(month);
  return months;
}
