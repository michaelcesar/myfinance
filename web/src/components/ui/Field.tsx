/**
 * Campos de formulário no estilo iOS: rótulo pequeno acima, controle em
 * fundo cinza translúcido, sem borda. Com `error`, o controle ganha o anel
 * de erro (`aria-invalid`) e a mensagem aparece embaixo, ligada ao controle
 * por `aria-describedby` — é o que a validação em tempo real do Formik usa.
 *
 * @module components/ui/Field
 */
'use client';

import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/cn';

/** Contêiner de campo (rótulo, controle, mensagem) — o `FieldSkeleton` usa o mesmo. */
export const FIELD_CLASS = 'flex flex-col gap-1.5';

/** Rótulo acima do controle. */
export const FIELD_LABEL_CLASS = 'px-1 text-footnote font-medium text-fg-muted';

/** Dica ou erro embaixo do controle. */
export const FIELD_MESSAGE_CLASS = 'px-1 text-caption';

/** Altura e raio dos controles de uma linha (campo, seletor). */
export const CONTROL_SHAPE_CLASS = 'h-11 rounded-control';

/** Classe base dos controles de texto. */
export const CONTROL_CLASS =
  'w-full rounded-control bg-fill-2 px-3.5 text-body text-fg outline-none transition-[box-shadow,background-color] duration-200 placeholder:text-fg-subtle hover:bg-fill focus:bg-surface focus:ring-[3px] focus:ring-focus-ring disabled:opacity-50 aria-invalid:bg-error-subtle aria-invalid:ring-[1.5px] aria-invalid:ring-error/60 aria-invalid:focus:ring-[3px] aria-invalid:focus:ring-error/30';

/**
 * Id da mensagem (dica ou erro) de um controle, para o `aria-describedby`.
 *
 * @param id - Id do controle
 * @returns Id da mensagem
 *
 * @example
 * messageId('nome'); // 'nome-message'
 */
export function messageId(id: string): string {
  return `${id}-message`;
}

/** Propriedades do invólucro de campo. */
export interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Dica ou erro embaixo do controle, com animação curta ao trocar.
 *
 * @param props - Id do controle, dica e erro
 * @returns Mensagem (ou nada)
 */
function FieldMessage({ htmlFor, hint, error }: { htmlFor: string; hint?: string; error?: string }) {
  return (
    <AnimatePresence initial={false} mode='wait'>
      {(error || hint) && (
        <motion.p
          key={error ? `error:${error}` : 'hint'}
          id={messageId(htmlFor)}
          role={error ? 'alert' : undefined}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
          className={cn(FIELD_MESSAGE_CLASS, error ? 'text-error' : 'text-fg-subtle')}
        >
          {error ?? hint}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/**
 * Rótulo + controle + dica/erro.
 *
 * @example
 * <Field label='Nome' htmlFor={id}><TextInput id={id} /></Field>
 */
export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn(FIELD_CLASS, className)}>
      <label htmlFor={htmlFor} className={FIELD_LABEL_CLASS}>
        {label}
      </label>
      {children}
      <FieldMessage htmlFor={htmlFor} hint={hint} error={error} />
    </div>
  );
}

/** Propriedades do campo de texto com rótulo embutido. */
export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/**
 * Campo de texto. Com `label`, já vem dentro de um `Field` com id gerado;
 * sem rótulo (só placeholder, como no login), a dica ou o erro entram como
 * irmão logo depois do controle — a árvore não muda quando o erro aparece ou
 * some, então o campo não é remontado e não perde o foco no meio da digitação.
 *
 * @example
 * <TextInput label='E-mail' type='email' value={email} onChange={e => setEmail(e.target.value)} />
 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput({ label, hint, error, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const input = <input ref={ref} id={inputId} className={cn(CONTROL_CLASS, 'h-11', className)} aria-invalid={!!error} aria-describedby={error || hint ? messageId(inputId) : undefined} {...props} />;
  if (!label) {
    return (
      <>
        {input}
        <FieldMessage htmlFor={inputId} hint={hint} error={error} />
      </>
    );
  }
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error}>
      {input}
    </Field>
  );
});

/** Propriedades da área de texto. */
export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

/**
 * Área de texto com rótulo.
 *
 * @example
 * <TextArea label='Observações' value={notes} onChange={e => setNotes(e.target.value)} />
 */
export function TextArea({ label, hint, error, className, id, ...props }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error}>
      <textarea
        id={inputId}
        rows={3}
        className={cn(CONTROL_CLASS, 'resize-none py-2.5', className)}
        aria-invalid={!!error}
        aria-describedby={error || hint ? messageId(inputId) : undefined}
        {...props}
      />
    </Field>
  );
}

/** Opção de seleção; com `group`, as opções viram `<optgroup>`. */
export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

/**
 * Agrupa opções por `group`, preservando a ordem de chegada.
 *
 * @param options - Opções
 * @returns Pares grupo → opções
 */
function groupOptions(options: SelectOption[]): [string, SelectOption[]][] {
  const groups = new Map<string, SelectOption[]>();
  for (const option of options) {
    const key = option.group ?? '';
    groups.set(key, [...(groups.get(key) ?? []), option]);
  }
  return [...groups.entries()];
}

/** Valor da opção "criar", que nunca chega ao `onChange`. */
export const CREATE_OPTION_VALUE = '__create__';

/** O que a lista vazia mostra: o aviso e a opção de criar. */
export interface SelectEmpty {
  message: string;
  createLabel: string;
  onCreate: () => void;
}

/** Propriedades do seletor. */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Lista vazia: ao abrir, avisa que não há opções e oferece criar uma. */
  empty?: SelectEmpty;
}

/**
 * Seletor nativo estilizado — acessível e com a roda de opções do próprio
 * sistema no celular. Com `empty` e sem opções, a lista mostra o aviso
 * (desabilitado) e a opção de criar, que chama `onCreate` em vez de `onChange`.
 *
 * @example
 * <Select label='Conta' options={accounts} value={accountId} onChange={e => setAccountId(e.target.value)} />
 */
export function Select({ label, options, placeholder, hint, error, empty, className, id, onChange, ...props }: SelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const offerCreate = empty !== undefined && options.length === 0;
  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error}>
      <div className='relative'>
        <select
          id={inputId}
          className={cn(CONTROL_CLASS, 'h-11 cursor-pointer appearance-none pr-9', className)}
          aria-invalid={!!error}
          aria-describedby={error || hint ? messageId(inputId) : undefined}
          {...props}
          onChange={event => {
            if (offerCreate && event.target.value === CREATE_OPTION_VALUE) {
              empty.onCreate();
              return;
            }
            onChange?.(event);
          }}
        >
          {placeholder !== undefined && <option value=''>{placeholder}</option>}
          {groupOptions(options).map(([group, items]) => {
            const rendered = items.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ));
            return group ? (
              <optgroup key={group} label={group}>
                {rendered}
              </optgroup>
            ) : (
              rendered
            );
          })}
          {offerCreate && (
            <>
              <option disabled>{empty.message}</option>
              <option value={CREATE_OPTION_VALUE}>{empty.createLabel}</option>
            </>
          )}
        </select>
        <ChevronDown className='pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-subtle' />
      </div>
    </Field>
  );
}
