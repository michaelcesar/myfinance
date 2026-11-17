/**
 * Testes do rendimento estimado das contas.
 *
 * @module test/common/yield.util.spec
 */
import { monthlyRate, monthlyYieldCents } from '~/common/utils/yield.util';

describe('yield.util', () => {
  it('converte taxa anual em mensal composta', () => {
    expect(monthlyRate(12)).toBeCloseTo(0.009489, 6);
    expect(monthlyRate(0)).toBe(0);
  });

  it('estima o rendimento do mês em centavos', () => {
    expect(monthlyYieldCents(1_000_000, 12)).toBe(9489);
  });

  it('sem taxa ou com saldo zerado ou negativo não rende', () => {
    expect(monthlyYieldCents(1_000_000, null)).toBe(0);
    expect(monthlyYieldCents(0, 12)).toBe(0);
    expect(monthlyYieldCents(-50_000, 12)).toBe(0);
  });
});
