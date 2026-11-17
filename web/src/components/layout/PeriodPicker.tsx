/**
 * Seletor do período de análise (mês ou ano) com setas.
 *
 * @module components/layout/PeriodPicker
 */
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl, SegmentedControlSkeleton } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { SkeletonText } from '@/components/ui/SkeletonKit';
import { cn } from '@/lib/cn';
import { usePeriod } from '@/providers/PeriodProvider';

/** Contêiner do seletor — o esqueleto usa o mesmo. */
const PERIOD_PICKER_CLASS = 'flex items-center gap-2';

/** Pílula com as setas e o rótulo. */
const PERIOD_STEPPER_CLASS = 'flex items-center gap-1 rounded-full bg-surface p-1 shadow-card';

/** Caixa do rótulo do período. */
const PERIOD_LABEL_CLASS = 'h-8 w-[156px] text-subhead font-semibold';

/**
 * Mês/Ano + "‹ Novembro de 2026 ›". O rótulo entra deslizando na direção
 * da seta clicada.
 *
 * @returns Controle de período
 */
export function PeriodPicker() {
  const { mode, setMode, label, shift, isCurrent, reset } = usePeriod();
  const [direction, setDirection] = useState(0);

  const go = (delta: number) => {
    setDirection(delta);
    shift(delta);
  };

  return (
    <div className={PERIOD_PICKER_CLASS}>
      <SegmentedControl
        label='Granularidade'
        size='sm'
        segments={[
          { value: 'month', label: 'Mês' },
          { value: 'year', label: 'Ano' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <div className={PERIOD_STEPPER_CLASS}>
        <IconButton label='Período anterior' tone='plain' onClick={() => go(-1)}>
          <ChevronLeft strokeWidth={2.4} />
        </IconButton>
        <button type='button' onClick={reset} title={isCurrent ? undefined : 'Voltar para hoje'} className={cn(PERIOD_LABEL_CLASS, 'relative overflow-hidden text-center')}>
          <AnimatePresence initial={false} mode='popLayout' custom={direction}>
            <motion.span
              key={label}
              custom={direction}
              variants={{
                enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
                center: { opacity: 1, x: 0 },
                exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
              }}
              initial='enter'
              animate='center'
              exit='exit'
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className='absolute inset-0 flex items-center justify-center'
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </button>
        <IconButton label='Próximo período' tone='plain' onClick={() => go(1)}>
          <ChevronRight strokeWidth={2.4} />
        </IconButton>
      </div>
    </div>
  );
}

/**
 * Esqueleto do seletor de período: o mesmo controle Mês/Ano e a mesma pílula,
 * com as setas e o rótulo trocados por blocos.
 *
 * @returns Seletor em esqueleto
 *
 * @example
 * <PageHeaderSkeleton actions={<PeriodPickerSkeleton />} />
 */
export function PeriodPickerSkeleton() {
  return (
    <div className={PERIOD_PICKER_CLASS} aria-hidden>
      <SegmentedControlSkeleton labels={['Mês', 'Ano']} size='sm' />
      <div className={PERIOD_STEPPER_CLASS}>
        <Skeleton className='size-8 rounded-full' />
        <div className={cn(PERIOD_LABEL_CLASS, 'flex items-center')}>
          <SkeletonText width={120} align='center' />
        </div>
        <Skeleton className='size-8 rounded-full' />
      </div>
    </div>
  );
}
