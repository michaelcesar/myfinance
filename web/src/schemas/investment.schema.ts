/**
 * Validação das folhas de investimento — espelha o `CreateInvestmentDto` e o
 * `CreateMovementDto` da API, mais a regra do serviço que recusa resgate
 * maior que o valor atual do ativo.
 *
 * @module schemas/investment.schema
 */
import './locale';
import { type InferType, mixed, number, object, string } from 'yup';
import { formatMoney } from '@/lib/format';
import { INVESTMENT_TYPE_LABELS } from '@/lib/labels';
import type { InvestmentType, MovementKind } from '@/types/entities';

/** Data no formato `AAAA-MM-DD`, o mesmo que a API aceita. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Tipos de movimentação aceitos pela API. */
const MOVEMENT_KINDS: MovementKind[] = ['CONTRIBUTION', 'WITHDRAWAL', 'YIELD'];

/** Schema do ativo (cadastro e edição). */
export const investmentSchema = object({
  ledgerId: string().required('Escolha o livro do investimento.'),
  name: string().trim().required('Informe o nome do investimento.').max(160),
  type: mixed<InvestmentType>()
    .oneOf(Object.keys(INVESTMENT_TYPE_LABELS) as InvestmentType[])
    .required(),
  institution: string().trim().max(120).default(''),
  currentValueCents: number().integer().nullable().default(null).min(0, 'O valor atual não pode ser negativo.'),
  valuedAt: string()
    .default('')
    .matches(ISO_DATE, { message: 'Informe uma data válida.', excludeEmptyString: true })
    .when('currentValueCents', {
      is: (value: number | null | undefined) => typeof value === 'number',
      then: schema => schema.required('Informe a data do valor atual.'),
    }),
  notes: string().trim().max(2000).default(''),
});

/** Valores da folha do ativo. */
export type InvestmentFormValues = InferType<typeof investmentSchema>;

/**
 * Cria o schema da movimentação. Com o valor atual do ativo, o resgate não
 * pode passar dele (a API recusa).
 *
 * @param availableCents - Valor atual do ativo, ou `null` para não limitar o resgate
 * @returns Schema da movimentação
 *
 * @example
 * createMovementSchema(investment.currentValueCents);
 */
export function createMovementSchema(availableCents: number | null) {
  return object({
    kind: mixed<MovementKind>().oneOf(MOVEMENT_KINDS).required(),
    amountCents: number()
      .integer()
      .nullable()
      .default(null)
      .test('required', 'Informe o valor.', value => typeof value === 'number')
      .moreThan(0, 'Informe um valor maior que zero.')
      .test('withdrawal-limit', `O resgate não pode passar do valor atual (${formatMoney(availableCents ?? 0)}).`, (value, context) => {
        const kind: unknown = context.parent.kind;
        return availableCents === null || kind !== 'WITHDRAWAL' || typeof value !== 'number' || value <= availableCents;
      }),
    date: string().required('Informe a data.').matches(ISO_DATE, 'Informe uma data válida.'),
    accountId: string().default(''),
    notes: string().trim().max(2000).default(''),
  });
}

/** Schema da movimentação sem limite de resgate (o limite vem de `createMovementSchema`). */
export const movementSchema = createMovementSchema(null);

/** Valores da folha de movimentação. */
export type MovementFormValues = InferType<typeof movementSchema>;
