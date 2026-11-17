/**
 * Testes dos schemas de investimento e movimentação.
 *
 * @module schemas/investment.schema.test
 */
import { describe, expect, it } from 'vitest';
import { createMovementSchema } from './investment.schema';

/**
 * Primeira mensagem de erro do schema para os valores, ou `null` se forem válidos.
 *
 * @param schema - Schema com `validate`
 * @param values - Valores
 * @returns Mensagem ou `null`
 */
async function firstError(schema: { validate: (values: unknown) => Promise<unknown> }, values: unknown): Promise<string | null> {
  try {
    await schema.validate(values);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

describe('createMovementSchema', () => {
  const schema = createMovementSchema(10000);
  const base = { kind: 'CONTRIBUTION', amountCents: 5000, date: '2026-11-17', accountId: '', notes: '' };

  it('aceita um aporte válido', async () => {
    expect(await firstError(schema, base)).toBeNull();
  });

  it('exige o valor', async () => {
    expect(await firstError(schema, { ...base, amountCents: null })).toBe('Informe o valor.');
  });

  it('recusa valor zero', async () => {
    expect(await firstError(schema, { ...base, amountCents: 0 })).toBe('Informe um valor maior que zero.');
  });

  it('recusa resgate maior que o valor atual', async () => {
    expect(await firstError(schema, { ...base, kind: 'WITHDRAWAL', amountCents: 10001 })).toMatch(/^O resgate não pode passar do valor atual/);
  });

  it('aceita aporte acima do valor atual', async () => {
    expect(await firstError(schema, { ...base, amountCents: 50000 })).toBeNull();
  });
});
