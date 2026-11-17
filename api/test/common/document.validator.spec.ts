/**
 * Testes da validação de CPF/CNPJ.
 *
 * @module test/common/document.validator.spec
 */
import { isValidDocument } from '~/common/validators/document.validator';

describe('isValidDocument', () => {
  it.each(['11222333000181', '52998224725'])('aceita documento válido %s', document => {
    expect(isValidDocument(document)).toBe(true);
  });

  it.each(['11222333000182', '52998224726', '11111111111', '123', 'abc'])('recusa %s', document => {
    expect(isValidDocument(document)).toBe(false);
  });
});
