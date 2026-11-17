/**
 * Patrimônio mostrado nas telas: bens físicos só entram com o selo ligado.
 *
 * @module lib/net-worth
 */

/** Partes do patrimônio devolvidas pela API. */
export interface NetWorthParts {
  cashCents: number;
  investmentsCents: number;
  assetsCents: number;
}

/**
 * Patrimônio a mostrar: contas + investimentos e, com o selo "Incluir bens"
 * ligado, também os bens físicos.
 *
 * @param parts - Caixa, investimentos e bens
 * @param includeAssets - Selo ligado
 * @returns Patrimônio em centavos
 *
 * @example
 * visibleNetWorth(summary, false); // sem carro e notebook
 */
export function visibleNetWorth(parts: NetWorthParts, includeAssets: boolean): number {
  return parts.cashCents + parts.investmentsCents + (includeAssets ? parts.assetsCents : 0);
}
