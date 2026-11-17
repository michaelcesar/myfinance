/**
 * Testes do schema de conta: taxa de rendimento.
 *
 * @module schemas/account.schema.test
 */
import { describe, expect, it } from 'vitest';
import { type AccountFormValues, accountSchema, parseRate } from './account.schema';

/** Conta válida, base dos casos. */
const base: AccountFormValues = { ledgerId: 'l1', name: 'Nubank', type: 'CHECKING', institution: '', initialBalanceCents: null, color: 'blue', annualYieldRate: '' };

/**
 * Mensagem de erro da taxa, ou `undefined` quando passa.
 *
 * @param annualYieldRate - Texto digitado
 * @returns Mensagem do erro
 */
async function rateError(annualYieldRate: string): Promise<string | undefined> {
  try {
    await accountSchema.validateAt('annualYieldRate', { ...base, annualYieldRate });
    return undefined;
  } catch (error) {
    return (error as Error).message;
  }
}

describe('taxa de rendimento da conta', () => {
  it('aceita vazio, vírgula e ponto', async () => {
    expect(await rateError('')).toBeUndefined();
    expect(await rateError('11,15')).toBeUndefined();
    expect(await rateError('11.15')).toBeUndefined();
  });

  it('recusa negativa, acima de 1000 e texto', async () => {
    for (const value of ['-1', '1000', 'abc']) expect(await rateError(value)).toBe('Informe uma taxa entre 0 e 999% ao ano.');
    expect(await rateError('999,9999')).toBeUndefined();
  });

  it('converte o texto para número', () => {
    expect(parseRate('11,15')).toBe(11.15);
    expect(parseRate('')).toBeNull();
  });
});
