/**
 * Controle segmentado do iOS, com o indicador deslizando entre as opções.
 *
 * @module components/ui/SegmentedControl
 */
'use client';

import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/lib/cn';
import { SkeletonText } from './SkeletonKit';

/** Trilho do controle — o `SegmentedControlSkeleton` usa o mesmo. */
export const SEGMENTED_CLASS = 'relative inline-flex rounded-control bg-fill p-0.5';

/** Altura, respiro e texto de cada segmento por tamanho. */
export const SEGMENT_SIZES = { sm: 'h-7 px-3 text-footnote', md: 'h-8 px-4 text-subhead' } as const;

/** Opção do controle. */
export interface Segment<T extends string> {
  value: T;
  label: string;
}

/** Propriedades do controle segmentado. */
export interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Grupo de opções exclusivas. O indicador usa `layoutId` do Motion para
 * deslizar com mola em vez de pular.
 *
 * @example
 * <SegmentedControl label='Tipo' segments={[{ value: 'EXPENSE', label: 'Despesa' }, ...]} value={kind} onChange={setKind} />
 */
export function SegmentedControl<T extends string>({ segments, value, onChange, label, size = 'md', className }: SegmentedControlProps<T>) {
  const groupId = useId();
  return (
    <div role='radiogroup' aria-label={label} className={cn(SEGMENTED_CLASS, className)}>
      {segments.map(segment => {
        const active = segment.value === value;
        return (
          <button
            key={segment.value}
            type='button'
            role='radio'
            aria-checked={active}
            onClick={() => onChange(segment.value)}
            className={cn(
              'relative z-(--z-raised) flex-1 rounded-md font-medium whitespace-nowrap transition-colors duration-200',
              SEGMENT_SIZES[size],
              active ? 'text-fg' : 'text-fg-muted hover:text-fg'
            )}
          >
            {active && (
              <motion.span
                layoutId={`segment-${groupId}`}
                className='absolute inset-0 -z-(--z-raised) rounded-md bg-surface shadow-segment dark:bg-fill-3'
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Esqueleto do controle segmentado: o mesmo trilho, com um segmento por rótulo.
 *
 * @param props - Rótulos (para a largura de cada segmento) e tamanho
 * @returns Trilho com barras no lugar dos rótulos
 *
 * @example
 * <SegmentedControlSkeleton labels={['Mês', 'Ano']} size='sm' />
 */
export function SegmentedControlSkeleton({ labels, size = 'md', className }: { labels: string[]; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div className={cn(SEGMENTED_CLASS, className)} aria-hidden>
      {labels.map(item => (
        <div key={item} className={cn('flex flex-1 items-center justify-center rounded-md', SEGMENT_SIZES[size])}>
          <SkeletonText className='w-auto' width={`${Math.max(item.length, 3) * 0.55}em`} align='center' />
        </div>
      ))}
    </div>
  );
}
