/**
 * Testes da conversão para snake_case.
 *
 * @module test/common/naming.strategy.spec
 */
import { toSnakeCase } from '~/config/naming.strategy';

describe('toSnakeCase', () => {
  it.each([
    ['initialBalanceCents', 'initial_balance_cents'],
    ['userId', 'user_id'],
    ['IncomeSource', 'income_source'],
    ['investmentMovementId', 'investment_movement_id'],
  ])('%s → %s', (input, expected) => {
    expect(toSnakeCase(input)).toBe(expected);
  });
});
