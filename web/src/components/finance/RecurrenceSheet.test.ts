/**
 * Testes das regras da folha de recorrente: troca de tipo e quando dá para encerrar.
 *
 * @module components/finance/RecurrenceSheet.test
 */
import { describe, expect, it } from 'vitest';
import type { RecurrenceFormValues } from '@/schemas/recurrence.schema';
import { canEndThisMonth, withKind } from './RecurrenceSheet';

/** Recorrente de receita preenchido. */
const values: RecurrenceFormValues = {
  kind: 'INCOME',
  description: 'Contrato Acme',
  amountCents: 900000,
  dayOfMonth: '10',
  dayOfMonthStart: '',
  accountId: 'a1',
  categoryId: 'salario',
  startMonth: '2026-11',
  endMonth: '',
  notes: '',
};

describe('withKind', () => {
  it('limpa a categoria ao trocar o tipo', () => {
    expect(withKind(values, 'EXPENSE')).toMatchObject({ kind: 'EXPENSE', categoryId: '', accountId: 'a1' });
  });

  it('não mexe em nada quando o tipo é o mesmo', () => {
    expect(withKind(values, 'INCOME')).toEqual(values);
  });
});

describe('canEndThisMonth', () => {
  it('encerra contrato em vigor e sem fim', () => {
    expect(canEndThisMonth({ startMonth: '2026-10-01', endMonth: null }, '2026-11')).toBe(true);
  });

  it('não oferece encerrar contrato que ainda não começou', () => {
    expect(canEndThisMonth({ startMonth: '2027-01-01', endMonth: null }, '2026-11')).toBe(false);
  });

  it('não oferece encerrar contrato que já tem fim', () => {
    expect(canEndThisMonth({ startMonth: '2026-10-01', endMonth: '2026-12-01' }, '2026-11')).toBe(false);
  });
});
