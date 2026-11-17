/**
 * Regra do dia do mês (vencimento, pagamento), compartilhada pelos schemas.
 *
 * @module schemas/day-of-month
 */

/**
 * Diz se o texto é um dia do mês válido: inteiro de 1 a 31.
 *
 * @param value - Texto digitado
 * @returns `true` quando é um dia válido
 *
 * @example
 * isDayOfMonth('31'); // true
 */
export function isDayOfMonth(value: string | undefined): boolean {
  if (!value || !/^\d+$/.test(value)) return false;
  const day = Number(value);
  return day >= 1 && day <= 31;
}
