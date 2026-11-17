/**
 * Natureza do lançamento.
 *
 * @module modules/transactions/enums/transaction-kind.enum
 */

/**
 * `INCOME`/`EXPENSE` são dinheiro que entra ou sai do patrimônio.
 * `TRANSFER_IN`/`TRANSFER_OUT` são dinheiro que só muda de lugar — entre
 * contas, entre livros ou para um investimento — e nunca contam como receita
 * ou despesa na visão consolidada (`ADR-005`).
 */
export enum TransactionKind {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
}
