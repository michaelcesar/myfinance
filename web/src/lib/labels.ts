/**
 * Rótulos em pt-BR dos enums da API.
 *
 * Única fonte do texto que o usuário vê para cada valor de enum: telas,
 * filtros e formulários leem daqui.
 *
 * @module lib/labels
 */
import type { AccountType, InvestmentType, MovementKind, TransactionKind, TransactionStatus, TransferKind } from '@/types/entities';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  DIGITAL_WALLET: 'Carteira digital',
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de crédito',
  BROKERAGE: 'Corretora',
};

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  INCOME: 'Receita',
  EXPENSE: 'Despesa',
  TRANSFER_IN: 'Entrada',
  TRANSFER_OUT: 'Saída',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  PAID: 'Pago',
  PENDING: 'Pendente',
};

export const TRANSFER_KIND_LABELS: Record<TransferKind, string> = {
  INTERNAL: 'Entre contas',
  PRO_LABORE: 'Pró-labore',
  PROFIT_DISTRIBUTION: 'Distribuição de lucros',
  CAPITAL_CONTRIBUTION: 'Aporte de capital',
  LOAN: 'Empréstimo',
  REIMBURSEMENT: 'Reembolso',
};

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  FIXED_INCOME: 'Renda fixa',
  STOCKS: 'Ações',
  REITS: 'Fundos imobiliários',
  FUNDS: 'Fundos',
  CRYPTO: 'Cripto',
  PENSION: 'Previdência',
  INTERNATIONAL: 'Internacional',
  OTHER: 'Outros',
  ASSET: 'Bens (carro, eletrônicos…)',
};

export const MOVEMENT_KIND_LABELS: Record<MovementKind, string> = {
  CONTRIBUTION: 'Aporte',
  WITHDRAWAL: 'Resgate',
  YIELD: 'Rendimento',
};

/**
 * Transforma um mapa de rótulos em opções de `<Select>`.
 *
 * @param labels - Mapa valor → rótulo
 * @returns Lista `{ value, label }` na ordem de declaração
 *
 * @example
 * toOptions(ACCOUNT_TYPE_LABELS); // [{ value: 'CHECKING', label: 'Conta corrente' }, ...]
 */
export function toOptions<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}
