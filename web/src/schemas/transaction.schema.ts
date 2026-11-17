/**
 * Validação da folha de lançamento — espelha o `CreateTransactionDto` (despesa
 * e receita) e o `CreateTransferDto` (transferência) da API.
 *
 * Os campos de conta dependem do tipo: despesa e receita pedem uma conta;
 * transferência pede origem e destino diferentes.
 *
 * @module schemas/transaction.schema
 */
import './locale';
import { boolean, type InferType, mixed, number, object, ref, string } from 'yup';
import { TRANSFER_KIND_LABELS } from '@/lib/labels';
import type { TransferKind } from '@/types/entities';

/** Tipo escolhido no topo da folha. */
export type EntryKind = 'EXPENSE' | 'INCOME' | 'TRANSFER';

/** Tipos da folha, na ordem do seletor. */
export const ENTRY_KINDS: EntryKind[] = ['EXPENSE', 'INCOME', 'TRANSFER'];

/** Data `AAAA-MM-DD`, o formato que a API aceita. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Diz se o tipo é transferência.
 *
 * @param kind - Tipo da folha
 * @returns `true` para transferência
 */
const isTransfer = (kind: unknown) => kind === 'TRANSFER';

/**
 * Diz se o tipo é despesa ou receita.
 *
 * @param kind - Tipo da folha
 * @returns `true` para despesa ou receita
 */
const isEntry = (kind: unknown) => kind !== 'TRANSFER';

/** Schema do lançamento ou da transferência. */
export const transactionSchema = object({
  kind: mixed<EntryKind>().oneOf(ENTRY_KINDS).required(),
  amountCents: number()
    .integer()
    .nullable()
    .default(null)
    .test('filled', 'Informe o valor.', value => value !== null && value !== undefined)
    .min(1, 'Informe um valor maior que zero.'),
  description: string()
    .trim()
    .max(200)
    .default('')
    .when('kind', { is: isEntry, then: schema => schema.required('Informe uma descrição.') }),
  date: string().required('Informe a data.').matches(ISO_DATE_PATTERN, 'Informe uma data válida.'),
  accountId: string()
    .default('')
    .when('kind', { is: isEntry, then: schema => schema.required('Escolha a conta.') }),
  fromAccountId: string()
    .default('')
    .when('kind', { is: isTransfer, then: schema => schema.required('Escolha a conta de origem.') }),
  toAccountId: string()
    .default('')
    .when('kind', {
      is: isTransfer,
      then: schema => schema.required('Escolha a conta de destino.').notOneOf([ref('fromAccountId')], 'Escolha uma conta de destino diferente da origem.'),
    }),
  categoryId: string().default(''),
  paid: boolean().default(true),
  notes: string().trim().max(2000).default(''),
  transferKind: mixed<TransferKind>()
    .oneOf(Object.keys(TRANSFER_KIND_LABELS) as TransferKind[], 'Escolha um motivo válido.')
    .nullable()
    .default(null),
});

/** Valores da folha de lançamento. */
export type TransactionFormValues = InferType<typeof transactionSchema>;
