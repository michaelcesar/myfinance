/**
 * Validação da folha de categoria — espelha o `CreateCategoryDto` da API.
 *
 * @module schemas/category.schema
 */
import './locale';
import { type InferType, mixed, object, string } from 'yup';
import { PALETTE_ORDER } from '@/lib/palette';
import type { CategoryKind, LedgerType, PaletteColor } from '@/types/entities';

/** Onde a categoria aparece; vazio é pessoal e empresas. */
export type CategoryScope = LedgerType | '';

/** Schema da categoria. */
export const categorySchema = object({
  kind: mixed<CategoryKind>().oneOf(['EXPENSE', 'INCOME'], 'Escolha despesa ou receita.').required(),
  name: string().trim().required('Informe o nome da categoria.').max(80),
  icon: string()
    .required('Escolha um ícone.')
    .matches(/^[a-z0-9-]{1,40}$/, 'Escolha um ícone válido.'),
  color: mixed<PaletteColor>().oneOf(PALETTE_ORDER).required(),
  ledgerType: mixed<CategoryScope>().oneOf(['', 'PERSONAL', 'COMPANY']).default(''),
});

/** Valores da folha de categoria. */
export type CategoryFormValues = InferType<typeof categorySchema>;
