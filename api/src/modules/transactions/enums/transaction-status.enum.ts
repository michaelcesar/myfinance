/**
 * Situação do lançamento.
 *
 * @module modules/transactions/enums/transaction-status.enum
 */

/** Só lançamentos `PAID` mexem no saldo; `PENDING` é previsão. */
export enum TransactionStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
}
