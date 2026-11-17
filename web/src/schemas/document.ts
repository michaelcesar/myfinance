/**
 * Regra de CPF/CNPJ compartilhada pelos schemas — espelha o `IsDocument` da API.
 *
 * A API remove tudo que não for dígito e confere os dígitos verificadores;
 * aqui a regra é a mesma, para o erro aparecer antes do envio.
 *
 * @module schemas/document
 */
import { string } from 'yup';

/**
 * Deixa só os dígitos do documento.
 *
 * @param value - Documento como digitado
 * @returns Só os dígitos
 *
 * @example
 * documentDigits('11.222.333/0001-81'); // '11222333000181'
 */
export function documentDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Calcula e compara os dois dígitos verificadores.
 *
 * @param digits - Documento completo, só dígitos
 * @param firstWeights - Pesos do primeiro dígito
 * @param secondWeights - Pesos do segundo dígito
 * @returns `true` quando os dois conferem
 */
function checkDigits(digits: string, firstWeights: number[], secondWeights: number[]): boolean {
  /**
   * Dígito verificador para um conjunto de pesos.
   *
   * @param weights - Pesos
   * @returns Dígito esperado
   */
  const verifier = (weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const length = digits.length;
  return verifier(firstWeights) === Number(digits[length - 2]) && verifier(secondWeights) === Number(digits[length - 1]);
}

/**
 * Confere o dígito verificador de um CPF (11 dígitos) ou CNPJ (14 dígitos).
 *
 * @param digits - Documento só com dígitos
 * @returns `true` quando o documento é válido
 *
 * @example
 * isValidDocument('11222333000181'); // true
 */
export function isValidDocument(digits: string): boolean {
  if (!/^\d+$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  if (digits.length === 11) return checkDigits(digits, [10, 9, 8, 7, 6, 5, 4, 3, 2], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (digits.length === 14) return checkDigits(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return false;
}

/**
 * Campo opcional de CPF ou CNPJ: vazio passa; preenchido precisa ter
 * dígitos verificadores corretos.
 *
 * @param message - Mensagem de documento inválido
 * @returns Schema do campo
 *
 * @example
 * object({ document: documentField() });
 */
export function documentField(message = 'Informe um CPF ou CNPJ válido.') {
  return string()
    .trim()
    .default('')
    .test('document', message, value => !value || isValidDocument(documentDigits(value)));
}
