/**
 * Tipos de conta onde o dinheiro fica.
 *
 * @module modules/accounts/enums/account-type.enum
 */

/** Natureza da conta; o cartão de crédito tem saldo negativo quando há fatura. */
export enum AccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  BROKERAGE = 'BROKERAGE',
}
