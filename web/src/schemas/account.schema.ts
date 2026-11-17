/**
 * Validação da folha de conta — espelha o `CreateAccountDto` da API.
 *
 * @module schemas/account.schema
 */
import './locale';
import { type InferType, mixed, number, object, string } from 'yup';
import { ACCOUNT_TYPE_LABELS } from '@/lib/labels';
import { PALETTE_ORDER } from '@/lib/palette';
import type { AccountType, PaletteColor } from '@/types/entities';

/** Mensagem da taxa inválida, a mesma da API. */
const RATE_MESSAGE = 'Informe uma taxa entre 0 e 999% ao ano.';

/**
 * Converte a taxa digitada ("11,15" ou "11.15") em número.
 *
 * @param text - Texto do campo
 * @returns Taxa em % ao ano, ou `null` quando vazio ou inválido
 *
 * @example
 * parseRate('11,15'); // 11.15
 */
export function parseRate(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!normalized || !/^\d+(\.\d{1,4})?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Schema da conta. */
export const accountSchema = object({
  ledgerId: string().required('Escolha o livro da conta.'),
  name: string().trim().required('Informe o nome da conta.').max(120),
  type: mixed<AccountType>()
    .oneOf(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[])
    .required(),
  institution: string().trim().max(120).default(''),
  initialBalanceCents: number().integer().nullable().default(null),
  color: mixed<PaletteColor>().oneOf(PALETTE_ORDER).required(),
  annualYieldRate: string()
    .trim()
    .default('')
    .test('rate', RATE_MESSAGE, value => {
      if (!value) return true;
      const rate = parseRate(value);
      return rate !== null && rate < 1000;
    }),
});

/** Valores da folha de conta. */
export type AccountFormValues = InferType<typeof accountSchema>;
