/**
 * Campo de valor em reais com máscara que cresce da direita, como numa
 * calculadora: digitar 1, 2, 5, 0 mostra R$ 12,50.
 *
 * @module components/ui/MoneyInput
 */
'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { CONTROL_CLASS, Field, messageId } from './Field';

/** Propriedades do campo monetário. */
export interface MoneyInputProps {
  label: string;
  /** Valor em centavos; `null` mostra o campo vazio. */
  value: number | null;
  onChange: (cents: number | null) => void;
  allowNegative?: boolean;
  size?: 'md' | 'hero';
  hint?: string;
  /** Mensagem de validação; liga o anel de erro. */
  error?: string;
  /** Nome do campo no formulário (foco no primeiro erro). */
  name?: string;
  /** Saída do campo — marca como visitado para a validação. */
  onBlur?: () => void;
  autoFocus?: boolean;
}

/**
 * Converte o texto digitado em centavos, ignorando tudo que não for dígito.
 *
 * @param text - Texto do campo
 * @returns Centavos, ou `null` sem dígitos
 *
 * @example
 * parseCents('R$ 12,50'); // 1250
 */
export function parseCents(text: string): number | null {
  const digits = text.replace(/\D/g, '').slice(0, 13);
  return digits ? Number(digits) : null;
}

/**
 * Campo de dinheiro. No tamanho `hero`, o valor fica grande e centralizado
 * — o campo principal do formulário de lançamento.
 *
 * @example
 * <MoneyInput label='Valor' value={cents} onChange={setCents} size='hero' />
 */
export function MoneyInput({ label, value, onChange, allowNegative = false, size = 'md', hint, error, name, onBlur, autoFocus }: MoneyInputProps) {
  const id = useId();
  const negative = allowNegative && value !== null && value < 0;
  const display = value === null ? '' : formatMoney(Math.abs(value));

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} className={size === 'hero' ? 'items-center text-center' : undefined}>
      <div className='relative flex w-full items-center gap-2'>
        {allowNegative && (
          <button
            type='button'
            onClick={() => value !== null && onChange(-value)}
            className={cn('h-11 shrink-0 rounded-control px-3 text-body font-semibold', negative ? 'bg-error-subtle text-error' : 'bg-fill-2 text-fg-muted')}
            aria-label='Inverter sinal'
          >
            ±
          </button>
        )}
        <input
          id={id}
          name={name}
          inputMode='numeric'
          aria-invalid={!!error}
          aria-describedby={error || hint ? messageId(id) : undefined}
          onBlur={onBlur}
          autoComplete='off'
          autoFocus={autoFocus}
          placeholder='R$ 0,00'
          value={negative ? `-${display}` : display}
          onChange={event => {
            const cents = parseCents(event.target.value);
            onChange(cents === null ? null : negative ? -cents : cents);
          }}
          className={cn(
            CONTROL_CLASS,
            'tabular',
            size === 'hero'
              ? 'h-16 bg-transparent text-center font-display text-display-lg font-bold tracking-[-0.03em] hover:bg-transparent focus:bg-transparent focus:ring-0 focus-visible:outline-none aria-invalid:bg-transparent aria-invalid:text-error aria-invalid:ring-0'
              : 'h-11'
          )}
        />
      </div>
    </Field>
  );
}
