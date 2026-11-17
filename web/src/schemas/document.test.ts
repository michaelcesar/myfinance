/**
 * Testes da regra de CPF/CNPJ e dos schemas que a usam.
 *
 * @module schemas/document.test
 */
import { describe, expect, it } from 'vitest';
import { categorySchema } from './category.schema';
import { isValidDocument } from './document';
import { ledgerSchema } from './ledger.schema';

describe('isValidDocument', () => {
  it('confere os dígitos de CPF e CNPJ', () => {
    expect(isValidDocument('52998224725')).toBe(true);
    expect(isValidDocument('11222333000181')).toBe(true);
    expect(isValidDocument('52998224720')).toBe(false);
    expect(isValidDocument('11111111111')).toBe(false);
    expect(isValidDocument('123')).toBe(false);
  });
});

describe('ledgerSchema', () => {
  const ledger = { personal: false, name: 'Studio Aurora', legalName: '', document: '', color: 'indigo' as const };

  it('aceita documento vazio ou com máscara válida', async () => {
    await expect(ledgerSchema.isValid(ledger)).resolves.toBe(true);
    await expect(ledgerSchema.isValid({ ...ledger, document: '11.222.333/0001-81' })).resolves.toBe(true);
  });

  it('recusa documento inválido', async () => {
    await expect(ledgerSchema.validateAt('document', { ...ledger, document: '11.222.333/0001-80' })).rejects.toThrow('Informe um CPF ou CNPJ válido.');
  });

  it('a mensagem do nome segue o tipo do livro', async () => {
    await expect(ledgerSchema.validateAt('name', { ...ledger, name: ' ' })).rejects.toThrow('Informe o nome da empresa.');
    await expect(ledgerSchema.validateAt('name', { ...ledger, personal: true, name: '' })).rejects.toThrow('Informe o nome do livro.');
  });
});

describe('categorySchema', () => {
  it('pede o nome e aceita o escopo vazio', async () => {
    const category = { kind: 'EXPENSE' as const, name: 'Pets', icon: 'tag', color: 'blue' as const, ledgerType: '' as const };
    await expect(categorySchema.isValid(category)).resolves.toBe(true);
    await expect(categorySchema.validateAt('name', { ...category, name: '' })).rejects.toThrow('Informe o nome da categoria.');
  });
});
