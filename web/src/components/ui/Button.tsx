/**
 * Botão no estilo Apple: preenchido, tingido, simples ou destrutivo.
 *
 * @module components/ui/Button
 */
'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Variante visual. */
export type ButtonVariant = 'primary' | 'tinted' | 'secondary' | 'plain' | 'destructive';

/** Tamanho. */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** Propriedades do botão. */
export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover active:opacity-90',
  tinted: 'bg-primary-subtle text-fg hover:bg-fill',
  secondary: 'bg-fill text-fg hover:bg-fill-3',
  plain: 'bg-transparent text-fg hover:bg-fill-2',
  destructive: 'bg-error-subtle text-error hover:bg-error/20',
};

/** Altura e raio de cada tamanho — o `ButtonSkeleton` usa os mesmos. */
export const BUTTON_SHAPES: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-full',
  md: 'h-10 rounded-full',
  lg: 'h-12 rounded-xl',
};

/** Classes completas de cada tamanho (altura, raio, respiro, texto) — o `ButtonSkeleton` com rótulo usa as mesmas. */
export const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: `${BUTTON_SHAPES.sm} gap-1.5 px-3 text-footnote`,
  md: `${BUTTON_SHAPES.md} gap-2 px-4 text-body`,
  lg: `${BUTTON_SHAPES.lg} gap-2 px-5 text-headline`,
};

/**
 * Botão com leve compressão ao toque (mola), como os controles do iOS.
 *
 * @example
 * <Button variant='primary' icon={<Plus />}>Novo lançamento</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, loading = false, disabled, className, children, type = 'button', ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-semibold tracking-[-0.01em] whitespace-nowrap transition-[background-color,filter,opacity] duration-200 disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <span className='size-4 animate-spin rounded-full border-2 border-current border-t-transparent' aria-hidden /> : icon}
      {children}
    </motion.button>
  );
});
