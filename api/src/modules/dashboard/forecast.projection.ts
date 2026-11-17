/**
 * Projeção dos recorrentes na previsão: funções puras, sem banco.
 *
 * @module modules/dashboard/forecast.projection
 */
import { addMonths } from '~/modules/recurrences/recurrence-months';

/** O que a projeção precisa de um recorrente. */
export interface ProjectableRecurrence {
  startMonth: string;
  endMonth: string | null;
  amountCents: number;
}

/**
 * Meses de `from` a `to`, inclusive.
 *
 * @param from - Primeiro mês (`YYYY-MM-01`)
 * @param to - Último mês (`YYYY-MM-01`)
 * @returns Meses em ordem; vazio se invertido
 *
 * @example
 * monthsBetween('2026-11-01', '2027-01-01'); // ['2026-11-01', '2026-12-01', '2027-01-01']
 */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  for (let month = from; month <= to; month = addMonths(month, 1)) months.push(month);
  return months;
}

/**
 * Valor que um recorrente deve trazer em cada mês do período que ainda não
 * tem lançamento: só do mês atual em diante, dentro da vigência e fora dos
 * meses tomados (lançamento vinculado ou mês que o dono tirou).
 *
 * @param recurrence - Vigência e valor atual
 * @param months - Meses do período
 * @param taken - Meses que já têm lançamento vinculado ou estão em `recurrence_skip`
 * @param current - Mês atual
 * @returns Mês → valor projetado em centavos
 *
 * @example
 * projectRecurrence({ startMonth: '2026-11-01', endMonth: null, amountCents: 380000 }, months, new Set(), '2026-11-01');
 */
export function projectRecurrence(recurrence: ProjectableRecurrence, months: string[], taken: Set<string>, current: string): Map<string, number> {
  const projected = new Map<string, number>();
  for (const month of months) {
    if (month < current || month < recurrence.startMonth) continue;
    if (recurrence.endMonth !== null && month > recurrence.endMonth) continue;
    if (taken.has(month)) continue;
    projected.set(month, recurrence.amountCents);
  }
  return projected;
}
