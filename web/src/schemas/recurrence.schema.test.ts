/**
 * Testes do schema de recorrente: obrigatórios, dia do vencimento e vigência.
 *
 * @module schemas/recurrence.schema.test
 */
import { describe, expect, it } from 'vitest';
import { type RecurrenceFormValues, recurrenceSchema } from './recurrence.schema';

/** Recorrente válido de receita, base dos casos. */
const base: RecurrenceFormValues = {
  kind: 'INCOME',
  description: 'Contrato Acme',
  amountCents: 900000,
  dayOfMonth: '10',
  dayOfMonthStart: '',
  accountId: 'a1',
  categoryId: '',
  startMonth: '2026-11',
  endMonth: '',
  notes: '',
};

/**
 * Mensagem de erro de um campo, ou `undefined` quando passa.
 *
 * @param values - Valores a validar
 * @param path - Campo
 * @returns Mensagem do primeiro erro do campo
 */
async function errorAt(values: RecurrenceFormValues, path: keyof RecurrenceFormValues): Promise<string | undefined> {
  try {
    await recurrenceSchema.validateAt(path, values);
    return undefined;
  } catch (error) {
    return (error as Error).message;
  }
}

describe('recurrenceSchema', () => {
  it('aceita um recorrente completo e sem fim', async () => {
    await expect(recurrenceSchema.validate(base)).resolves.toBeTruthy();
  });

  it('exige descrição', async () => {
    expect(await errorAt({ ...base, description: '  ' }, 'description')).toBe('Informe uma descrição.');
  });

  it('exige valor maior que zero', async () => {
    expect(await errorAt({ ...base, amountCents: 0 }, 'amountCents')).toBe('Informe um valor maior que zero.');
  });

  it('aceita só dia entre 1 e 31', async () => {
    expect(await errorAt({ ...base, dayOfMonth: '32' }, 'dayOfMonth')).toBe('Informe um dia entre 1 e 31.');
    expect(await errorAt({ ...base, dayOfMonth: 'abc' }, 'dayOfMonth')).toBe('Informe um dia entre 1 e 31.');
    expect(await errorAt({ ...base, dayOfMonth: '' }, 'dayOfMonth')).toBe('Informe um dia entre 1 e 31.');
    expect(await errorAt({ ...base, dayOfMonth: '31' }, 'dayOfMonth')).toBeUndefined();
  });

  it('aceita janela de recebimento e recusa início depois do prazo', async () => {
    expect(await errorAt({ ...base, dayOfMonthStart: '1', dayOfMonth: '5' }, 'dayOfMonthStart')).toBeUndefined();
    expect(await errorAt({ ...base, dayOfMonthStart: '6', dayOfMonth: '5' }, 'dayOfMonthStart')).toBe('O primeiro dia não pode ser depois do último.');
    expect(await errorAt({ ...base, dayOfMonthStart: '0' }, 'dayOfMonthStart')).toBe('Informe um dia entre 1 e 31.');
  });

  it('exige conta e mês de início', async () => {
    expect(await errorAt({ ...base, accountId: '' }, 'accountId')).toBe('Escolha a conta.');
    expect(await errorAt({ ...base, startMonth: '' }, 'startMonth')).toBe('Informe o mês de início.');
  });

  it('recusa fim antes do início e aceita fim igual', async () => {
    expect(await errorAt({ ...base, endMonth: '2026-10' }, 'endMonth')).toBe('O fim não pode ser antes do início.');
    expect(await errorAt({ ...base, endMonth: '2026-11' }, 'endMonth')).toBeUndefined();
  });
});
