/**
 * Motivo de uma transferência.
 *
 * @module modules/transactions/enums/transfer-kind.enum
 */

/**
 * Por que o dinheiro mudou de lugar. Entre contas do mesmo livro é
 * `INTERNAL`; da empresa para o pessoal costuma ser `PRO_LABORE` ou
 * `PROFIT_DISTRIBUTION`; do pessoal para a empresa, `CAPITAL_CONTRIBUTION`.
 */
export enum TransferKind {
  INTERNAL = 'INTERNAL',
  PRO_LABORE = 'PRO_LABORE',
  PROFIT_DISTRIBUTION = 'PROFIT_DISTRIBUTION',
  CAPITAL_CONTRIBUTION = 'CAPITAL_CONTRIBUTION',
  LOAN = 'LOAN',
  REIMBURSEMENT = 'REIMBURSEMENT',
}
