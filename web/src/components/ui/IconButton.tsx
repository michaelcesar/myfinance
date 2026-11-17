/**
 * Botão redondo só com ícone.
 *
 * @module components/ui/IconButton
 */
'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Propriedades do botão de ícone; `label` vira o nome acessível. */
export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  label: string;
  children: ReactNode;
  tone?: 'fill' | 'plain' | 'primary';
}

const TONES = {
  fill: 'bg-fill text-fg-muted hover:bg-fill-3 hover:text-fg',
  plain: 'text-fg-muted hover:bg-fill hover:text-fg',
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
} as const;

/**
 * Botão circular de 32 px com nome acessível obrigatório.
 *
 * @example
 * <IconButton label='Fechar' onClick={close}><X /></IconButton>
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ label, children, tone = 'fill', className, type = 'button', ...props }, ref) {
  return (
    <motion.button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200 [&_svg]:size-[17px]', TONES[tone], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
});
