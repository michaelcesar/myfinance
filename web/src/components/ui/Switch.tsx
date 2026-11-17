/**
 * Chave liga/desliga do iOS.
 *
 * @module components/ui/Switch
 */
'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

/** Propriedades da chave. */
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

/**
 * Linha com texto à esquerda e a chave verde à direita.
 *
 * @example
 * <Switch label='Já foi pago' checked={paid} onChange={setPaid} />
 */
export function Switch({ checked, onChange, label, description }: SwitchProps) {
  return (
    <label className='flex cursor-pointer items-center justify-between gap-4 rounded-control bg-fill-2 px-3.5 py-2.5'>
      <span className='min-w-0'>
        <span className='block text-body'>{label}</span>
        {description && <span className='block text-caption text-fg-muted'>{description}</span>}
      </span>
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative h-[31px] w-[51px] shrink-0 rounded-full p-[2px] transition-colors duration-300', checked ? 'bg-primary' : 'bg-fill-3')}
      >
        <motion.span
          className={cn('block size-[27px] rounded-full shadow-thumb', checked ? 'bg-primary-fg' : 'bg-white')}
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 700, damping: 38 }}
        />
      </button>
    </label>
  );
}
