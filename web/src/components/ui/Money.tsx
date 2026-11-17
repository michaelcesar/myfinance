/**
 * Exibição de valores monetários, com animação de contagem.
 *
 * @module components/ui/Money
 */
'use client';

import { animate, useMotionValue, useReducedMotion, useTransform, motion } from 'motion/react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';

/** Propriedades do valor. */
export interface MoneyProps {
  cents: number;
  signed?: boolean;
  compact?: boolean;
  /** Pinta de verde (positivo) e vermelho (negativo). */
  tone?: 'auto' | 'none' | 'positive' | 'negative';
  animated?: boolean;
  className?: string;
}

/**
 * Valor em reais com algarismos tabulares. Com `animated`, conta do valor
 * anterior até o novo ao trocar de período — o número "rola".
 *
 * @example
 * <Money cents={summary.netWorthCents} animated className='text-display font-bold' />
 */
export function Money({ cents, signed = false, compact = false, tone = 'none', animated = false, className }: MoneyProps) {
  const reduceMotion = useReducedMotion();
  const value = useMotionValue(cents);
  const text = useTransform(value, latest => formatMoney(Math.round(latest), { signed, compact }));

  useEffect(() => {
    if (!animated || reduceMotion) {
      value.set(cents);
      return;
    }
    const controls = animate(value, cents, { duration: 0.8, ease: [0.32, 0.72, 0, 1] });
    return () => controls.stop();
  }, [animated, cents, reduceMotion, value]);

  const toneClass = tone === 'positive' || (tone === 'auto' && cents > 0) ? 'text-success' : tone === 'negative' || (tone === 'auto' && cents < 0) ? 'text-error' : undefined;

  if (!animated) return <span className={cn('tabular', toneClass, className)}>{formatMoney(cents, { signed, compact })}</span>;
  return <motion.span className={cn('tabular', toneClass, className)}>{text}</motion.span>;
}
