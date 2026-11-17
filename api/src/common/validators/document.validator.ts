/**
 * Validação e normalização de CPF/CNPJ.
 *
 * @module common/validators/document.validator
 */
import { Transform } from 'class-transformer';
import { registerDecorator, type ValidationOptions } from 'class-validator';

/**
 * Remove tudo que não for dígito; string vazia vira `null`.
 *
 * @example
 * @OnlyDigits()
 * document?: string | null;
 */
export const OnlyDigits = () =>
  Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined) return value;
    const digits = String(value).replace(/\D/g, '');
    return digits.length ? digits : null;
  });

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
 * Calcula e compara os dois dígitos verificadores.
 *
 * @param digits - Documento completo
 * @param firstWeights - Pesos do primeiro dígito
 * @param secondWeights - Pesos do segundo dígito
 * @returns `true` quando os dois conferem
 */
function checkDigits(digits: string, firstWeights: number[], secondWeights: number[]): boolean {
  const verifier = (weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + Number(digits[index]) * weight, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const length = digits.length;
  return verifier(firstWeights) === Number(digits[length - 2]) && verifier(secondWeights) === Number(digits[length - 1]);
}

/**
 * Valida um CPF ou CNPJ já normalizado por `@OnlyDigits()`.
 *
 * @param options - Opções do class-validator
 * @returns Decorator de propriedade
 *
 * @example
 * @IsOptional()
 * @OnlyDigits()
 * @IsDocument()
 * document?: string | null;
 */
export function IsDocument(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isDocument',
      target: target.constructor,
      propertyName: String(propertyName),
      options: { message: 'CPF ou CNPJ inválido.', ...options },
      validator: {
        validate: (value: unknown) => value === null || value === undefined || (typeof value === 'string' && isValidDocument(value)),
      },
    });
  };
}
