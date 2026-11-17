/**
 * Testes do rótulo de vencimento dos recorrentes.
 *
 * @module components/finance/RecurrencesPanel.test
 */
import { describe, expect, it } from 'vitest';
import { dueDayLabel } from './RecurrencesPanel';

describe('dueDayLabel', () => {
  it('mostra o dia fixo', () => {
    expect(dueDayLabel({ dayOfMonthStart: null, dayOfMonth: 10 })).toBe('todo dia 10');
  });

  it('mostra a janela de recebimento', () => {
    expect(dueDayLabel({ dayOfMonthStart: 1, dayOfMonth: 5 })).toBe('entre dia 1 e 5');
  });

  it('janela de um dia só vira dia fixo', () => {
    expect(dueDayLabel({ dayOfMonthStart: 5, dayOfMonth: 5 })).toBe('todo dia 5');
  });
});
