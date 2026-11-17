/**
 * Validação da folha de empresa (ou do livro pessoal) — espelha o `CreateLedgerDto` da API.
 *
 * @module schemas/ledger.schema
 */
import './locale';
import { boolean, type InferType, mixed, object, string } from 'yup';
import { PALETTE_ORDER } from '@/lib/palette';
import type { PaletteColor } from '@/types/entities';
import { documentField } from './document';

/** Schema do livro. `personal` só ajusta as mensagens ao livro pessoal. */
export const ledgerSchema = object({
  personal: boolean().default(false),
  name: string()
    .trim()
    .max(120)
    .default('')
    .when('personal', {
      is: true,
      then: schema => schema.required('Informe o nome do livro.'),
      otherwise: schema => schema.required('Informe o nome da empresa.'),
    }),
  legalName: string().trim().max(200).default(''),
  document: documentField(),
  color: mixed<PaletteColor>().oneOf(PALETTE_ORDER).required(),
});

/** Valores da folha de empresa. */
export type LedgerFormValues = InferType<typeof ledgerSchema>;
