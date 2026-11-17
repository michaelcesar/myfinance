/**
 * Utilitários de período (intervalo de datas) para relatórios.
 *
 * Datas de lançamento são `date` puro (`YYYY-MM-DD`), sem fuso: um gasto do
 * dia 31 continua no dia 31 em qualquer fuso de quem consulta.
 *
 * @module common/utils/period.util
 */

/** Intervalo fechado de datas no formato `YYYY-MM-DD`. */
export interface Period {
  from: string;
  to: string;
}

/** Formato aceito para datas de calendário. */
export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formata uma data local como `YYYY-MM-DD`.
 *
 * @param date - Data a formatar
 * @returns Data de calendário
 *
 * @example
 * toIsoDate(new Date(2026, 0, 5)); // '2026-01-05'
 */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Resolve o período pedido, usando o mês corrente como padrão.
 *
 * Valores ausentes ou malformados caem no primeiro e no último dia do mês
 * de `today`; um intervalo invertido é reordenado.
 *
 * @param from - Início informado na query
 * @param to - Fim informado na query
 * @param today - Data de referência (injetável nos testes)
 * @returns Período válido
 *
 * @example
 * resolvePeriod(undefined, undefined, new Date(2026, 10, 16));
 * // { from: '2026-11-01', to: '2026-11-30' }
 */
export function resolvePeriod(from?: string, to?: string, today: Date = new Date()): Period {
  const monthStart = toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1));
  const monthEnd = toIsoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const start = from && ISO_DATE_PATTERN.test(from) ? from : monthStart;
  const end = to && ISO_DATE_PATTERN.test(to) ? to : monthEnd;
  return start <= end ? { from: start, to: end } : { from: end, to: start };
}

/**
 * Lista os meses (`YYYY-MM`) que terminam no mês de `today`.
 *
 * @param count - Quantidade de meses
 * @param today - Data de referência
 * @returns Meses do mais antigo ao mais recente
 *
 * @example
 * lastMonths(3, new Date(2026, 0, 10)); // ['2025-11', '2025-12', '2026-01']
 */
export function lastMonths(count: number, today: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (count - 1 - index), 1);
    return toIsoDate(date).slice(0, 7);
  });
}
