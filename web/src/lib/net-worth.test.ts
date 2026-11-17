/**
 * Testes do patrimônio mostrado, com e sem bens.
 *
 * @module lib/net-worth.test
 */
import { describe, expect, it } from 'vitest';
import { visibleNetWorth } from './net-worth';

describe('visibleNetWorth', () => {
  const parts = { cashCents: 1_000_000, investmentsCents: 500_000, assetsCents: 6_800_000 };

  it('deixa os bens de fora por padrão', () => {
    expect(visibleNetWorth(parts, false)).toBe(1_500_000);
  });

  it('soma os bens quando o selo está ligado', () => {
    expect(visibleNetWorth(parts, true)).toBe(8_300_000);
  });
});
