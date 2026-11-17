/**
 * Rendimento estimado de uma conta a partir da taxa anual informada pelo dono.
 *
 * @module common/utils/yield.util
 */

/**
 * Taxa mensal equivalente a uma taxa anual, com juros compostos.
 *
 * @param annualRatePercent - Taxa em % ao ano (ex.: 12 para 12% a.a.)
 * @returns Taxa mensal como fração (0,0095 = 0,95% ao mês)
 *
 * @example
 * monthlyRate(12); // ≈ 0.009489
 */
export function monthlyRate(annualRatePercent: number): number {
  return Math.pow(1 + annualRatePercent / 100, 1 / 12) - 1;
}

/**
 * Rendimento estimado de um mês sobre o saldo. Sem taxa, ou com saldo zerado
 * ou negativo (cartão, cheque especial), não há rendimento.
 *
 * @param balanceCents - Saldo em centavos
 * @param annualRatePercent - Taxa em % ao ano, ou `null`
 * @returns Rendimento do mês em centavos, arredondado
 *
 * @example
 * monthlyYieldCents(1_000_000, 12); // 9489
 */
export function monthlyYieldCents(balanceCents: number, annualRatePercent: number | null): number {
  if (!annualRatePercent || balanceCents <= 0) return 0;
  return Math.round(balanceCents * monthlyRate(annualRatePercent));
}
