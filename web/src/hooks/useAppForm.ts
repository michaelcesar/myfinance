/**
 * Formulário padrão do Finance Manager: Formik com schema Yup e validação em tempo real.
 *
 * Mesmo comportamento dos formulários do toca aê: o campo é validado ao sair
 * dele e, a partir daí, a cada tecla; o envio valida tudo, marca os campos
 * com erro e leva o foco ao primeiro; um segundo clique durante o envio é
 * ignorado. Os valores enviados passam pelo `cast` do schema (aparam espaços,
 * convertem tipos). Erro da API não precisa de tratamento aqui: o
 * `QueryProvider` já mostra o aviso de toda mutação que falha.
 *
 * @module hooks/useAppForm
 */
'use client';

import { type FormikValues, setNestedObjectValues, useFormik } from 'formik';
import { type FormEvent, useRef } from 'react';
import type { AnyObjectSchema } from 'yup';
import { focusFirstError } from '@/lib/form';

/** Configuração do formulário. */
export interface UseAppFormOptions<T extends FormikValues> {
  initialValues: T;
  schema: AnyObjectSchema;
  /** Recebe os valores já convertidos pelo schema. */
  onSubmit: (values: T) => Promise<unknown> | void;
}

/**
 * Cria o formulário e o envio protegido (`submit`), para usar em `<form onSubmit={form.submit}>`.
 *
 * @param options - Valores iniciais, schema e envio
 * @returns Estado do Formik mais `submit`
 *
 * @example
 * const form = useAppForm({ initialValues: { name: '' }, schema: clientSchema, onSubmit: values => save.mutateAsync(values) });
 * <form onSubmit={form.submit}><TextInput label='Nome' {...textField(form, 'name')} /></form>
 */
export function useAppForm<T extends FormikValues>({ initialValues, schema, onSubmit }: UseAppFormOptions<T>) {
  const busy = useRef(false);
  const form = useFormik<T>({
    initialValues,
    validationSchema: schema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async values => {
      await onSubmit(schema.cast(values) as T);
    },
  });

  /**
   * Valida e envia, uma vez por vez.
   *
   * @param event - Submit do `<form>` (opcional)
   */
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    if (busy.current) return;
    busy.current = true;
    try {
      const errors = await form.validateForm();
      const names = Object.keys(errors);
      if (names.length) {
        await form.setTouched(setNestedObjectValues(errors, true), false);
        focusFirstError(names);
        return;
      }
      await form.submitForm();
    } catch {
      /** Erro da API: o aviso já saiu pelo `QueryProvider`; o formulário fica aberto para corrigir. */
    } finally {
      busy.current = false;
    }
  }

  return { ...form, submit };
}
