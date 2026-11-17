/**
 * Validação da folha de recorrente — espelha o `CreateRecurrenceDto` da API e
 * a regra de vigência do serviço (fim não antes do início).
 *
 * @module schemas/recurrence.schema
 */
import './locale';
import { type InferType, mixed, number, object, string } from 'yup';
import { isDayOfMonth } from './day-of-month';

/** Mês no formato `AAAA-MM`, o do `<input type="month">`. */
const MONTH = /^\d{4}-\d{2}$/;

/** Schema do recorrente. */
export const recurrenceSchema = object({
  kind: mixed<'INCOME' | 'EXPENSE'>().oneOf(['INCOME', 'EXPENSE']).required(),
  description: string().trim().required('Informe uma descrição.').max(200),
  amountCents: number()
    .integer()
    .nullable()
    .default(null)
    .test('filled', 'Informe um valor maior que zero.', value => value !== null && value !== undefined)
    .moreThan(0, 'Informe um valor maior que zero.'),
  dayOfMonth: string().trim().default('').test('day-of-month', 'Informe um dia entre 1 e 31.', isDayOfMonth),
  dayOfMonthStart: string()
    .trim()
    .default('')
    .test('day-of-month', 'Informe um dia entre 1 e 31.', value => !value || isDayOfMonth(value))
    .test('before-end', 'O primeiro dia não pode ser depois do último.', (value, context) => {
      const end: unknown = context.parent.dayOfMonth;
      return !value || typeof end !== 'string' || !isDayOfMonth(end) || Number(value) <= Number(end);
    }),
  accountId: string().required('Escolha a conta.'),
  categoryId: string().default(''),
  startMonth: string().default('').required('Informe o mês de início.').matches(MONTH, 'Informe o mês de início.'),
  endMonth: string()
    .default('')
    .matches(MONTH, { message: 'Informe um mês de fim válido.', excludeEmptyString: true })
    .test('after-start', 'O fim não pode ser antes do início.', (value, context) => {
      const start: unknown = context.parent.startMonth;
      return !value || typeof start !== 'string' || !start || value >= start;
    }),
  notes: string().trim().max(2000).default(''),
});

/** Valores da folha de recorrente. */
export type RecurrenceFormValues = InferType<typeof recurrenceSchema>;
