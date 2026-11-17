/**
 * Testes da sugestão de motivo de transferência.
 *
 * @module components/finance/TransactionSheet.test
 */
import { describe, expect, it } from 'vitest';
import type { Ledger } from '@/types/entities';
import { suggestTransferKind } from './TransactionSheet';

/**
 * Livro mínimo para o teste.
 *
 * @param ledgerId - Id
 * @param type - Tipo
 * @returns Livro
 */
const ledger = (ledgerId: string, type: Ledger['type']): Ledger => ({ ledgerId, type, name: ledgerId, legalName: null, document: null, color: 'blue', archived: false, createdAt: '' });

describe('suggestTransferKind', () => {
  const personal = ledger('p', 'PERSONAL');
  const company = ledger('c', 'COMPANY');

  it('empresa → pessoal é pró-labore', () => {
    expect(suggestTransferKind(company, personal)).toBe('PRO_LABORE');
  });

  it('pessoal → empresa é aporte de capital', () => {
    expect(suggestTransferKind(personal, company)).toBe('CAPITAL_CONTRIBUTION');
  });

  it('mesmo livro ou contas não escolhidas é entre contas', () => {
    expect(suggestTransferKind(personal, personal)).toBe('INTERNAL');
    expect(suggestTransferKind(undefined, personal)).toBe('INTERNAL');
  });
});
