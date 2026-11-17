/**
 * Classes de investimento.
 *
 * @module modules/investments/enums/investment-type.enum
 */

/** Classe do ativo, usada para agrupar a carteira. */
export enum InvestmentType {
  FIXED_INCOME = 'FIXED_INCOME',
  STOCKS = 'STOCKS',
  REITS = 'REITS',
  FUNDS = 'FUNDS',
  CRYPTO = 'CRYPTO',
  PENSION = 'PENSION',
  INTERNATIONAL = 'INTERNATIONAL',
  OTHER = 'OTHER',
  /** Bem físico (carro, eletrônicos): o valor atualizado mostra a perda; fica fora dos investimentos que rendem. */
  ASSET = 'ASSET',
}
