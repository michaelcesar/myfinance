/**
 * Ligações entre o Formik e os campos do design system.
 *
 * Cada função devolve as props prontas de um campo (`name`, `value`,
 * `onChange`, `onBlur`, `error`), para os formulários não repetirem a mesma
 * fiação. O erro só aparece depois que a pessoa sai do campo ou tenta enviar;
 * daí em diante a validação corre a cada tecla (tempo real).
 *
 * @module lib/form
 */
import { type FormikProps, type FormikValues, getIn } from 'formik';

/** O que as ligações precisam do Formik. */
export type FormBinding<T extends FormikValues> = Pick<FormikProps<T>, 'values' | 'errors' | 'touched' | 'submitCount' | 'handleChange' | 'handleBlur' | 'setFieldValue' | 'setFieldTouched'>;

/** Nome de um campo do formulário. */
export type FieldName<T> = Extract<keyof T, string>;

/**
 * Mensagem de erro visível de um campo.
 *
 * @param form - Formulário
 * @param name - Campo
 * @returns Mensagem, ou `undefined` enquanto o campo não foi visitado
 *
 * @example
 * fieldError(form, 'name'); // 'Informe o nome.'
 */
export function fieldError<T extends FormikValues>(form: FormBinding<T>, name: FieldName<T>): string | undefined {
  const error: unknown = getIn(form.errors, name);
  const visited = Boolean(getIn(form.touched, name)) || form.submitCount > 0;
  return visited && typeof error === 'string' ? error : undefined;
}

/**
 * Props de um campo de texto, área de texto ou seletor nativo.
 *
 * @param form - Formulário
 * @param name - Campo
 * @returns Props para `TextInput`, `TextArea` ou `Select`
 *
 * @example
 * <TextInput label='Nome' {...textField(form, 'name')} />
 */
export function textField<T extends FormikValues>(form: FormBinding<T>, name: FieldName<T>) {
  const value: unknown = getIn(form.values, name);
  return { name, value: typeof value === 'string' ? value : '', onChange: form.handleChange, onBlur: form.handleBlur, error: fieldError(form, name) };
}

/**
 * Props de um `MoneyInput` (centavos ou `null`).
 *
 * @param form - Formulário
 * @param name - Campo
 * @returns Props para `MoneyInput`
 *
 * @example
 * <MoneyInput label='Valor' {...moneyField(form, 'amountCents')} />
 */
export function moneyField<T extends FormikValues>(form: FormBinding<T>, name: FieldName<T>) {
  const value: unknown = getIn(form.values, name);
  return {
    name,
    value: typeof value === 'number' ? value : null,
    onChange: (cents: number | null) => void form.setFieldValue(name, cents, true),
    onBlur: () => void form.setFieldTouched(name, true, true),
    error: fieldError(form, name),
  };
}

/**
 * Leva o foco ao primeiro campo com erro, na ordem em que aparecem na tela.
 *
 * @param names - Campos com erro
 *
 * @example
 * focusFirstError(['name', 'amountCents']);
 */
export function focusFirstError(names: string[]): void {
  requestAnimationFrame(() => {
    const elements = names
      .map(name => document.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`))
      .filter((element): element is HTMLElement => element !== null)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const first = elements[0];
    if (!first) return;
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    first.focus({ preventScroll: true });
  });
}
