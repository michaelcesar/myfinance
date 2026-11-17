/**
 * Testes do schema de lançamento: regras por tipo e transferência.
 *
 * @module schemas/transaction.schema.test
 */
import { describe, expect, it } from 'vitest';
import { type TransactionFormValues, transactionSchema } from './transaction.schema';

/** Lançamento válido de despesa, base dos casos. */
const base: TransactionFormValues = {
  kind: 'EXPENSE',
  amountCents: 1250,
  description: 'Mercado',
  date: '2026-11-17',
  accountId: 'a1',
  fromAccountId: '',
  toAccountId: '',
  categoryId: '',
  paid: true,
  notes: '',
  transferKind: null,
};

/**
 * Mensagem de erro de um campo, ou `undefined` quando passa.
 *
 * @param values - Valores a validar
 * @param path - Campo
 * @returns Mensagem do primeiro erro do campo
 */
async function errorAt(values: TransactionFormValues, path: keyof TransactionFormValues): Promise<string | undefined> {
  try {
    await transactionSchema.validateAt(path, values);
    return undefined;
  } catch (error) {
    return (error as Error).message;
  }
}

describe('transactionSchema', () => {
  it('aceita uma despesa completa', async () => {
    await expect(transactionSchema.isValid(base)).resolves.toBe(true);
  });

  it('pede valor maior que zero', async () => {
    expect(await errorAt({ ...base, amountCents: null }, 'amountCents')).toBe('Informe o valor.');
    expect(await errorAt({ ...base, amountCents: 0 }, 'amountCents')).toBe('Informe um valor maior que zero.');
  });

  it('despesa e receita pedem descrição e conta', async () => {
    expect(await errorAt({ ...base, description: '   ' }, 'description')).toBe('Informe uma descrição.');
    expect(await errorAt({ ...base, accountId: '' }, 'accountId')).toBe('Escolha a conta.');
  });

  it('transferência pede duas contas diferentes e dispensa descrição e conta única', async () => {
    const transfer: TransactionFormValues = { ...base, kind: 'TRANSFER', description: '', accountId: '', fromAccountId: 'a1', toAccountId: 'a2' };
    await expect(transactionSchema.isValid(transfer)).resolves.toBe(true);
    expect(await errorAt({ ...transfer, fromAccountId: '' }, 'fromAccountId')).toBe('Escolha a conta de origem.');
    expect(await errorAt({ ...transfer, toAccountId: '' }, 'toAccountId')).toBe('Escolha a conta de destino.');
    expect(await errorAt({ ...transfer, toAccountId: 'a1' }, 'toAccountId')).toBe('Escolha uma conta de destino diferente da origem.');
  });

  it('recusa data fora do formato da API', async () => {
    expect(await errorAt({ ...base, date: '17/11/2026' }, 'date')).toBe('Informe uma data válida.');
  });
});
