/**
 * Seletor de cor da paleta (círculos, como no app Lembretes).
 *
 * @module components/ui/ColorPicker
 */
'use client';

import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { PALETTE, PALETTE_ORDER } from '@/lib/palette';
import type { PaletteColor } from '@/types/entities';

/** Propriedades do seletor de cor. */
export interface ColorPickerProps {
  value: PaletteColor;
  onChange: (color: PaletteColor) => void;
}

const COLOR_NAMES: Record<PaletteColor, string> = {
  blue: 'Azul',
  indigo: 'Índigo',
  purple: 'Roxo',
  pink: 'Rosa',
  red: 'Vermelho',
  orange: 'Laranja',
  yellow: 'Amarelo',
  green: 'Verde',
  mint: 'Menta',
  teal: 'Verde-azulado',
  cyan: 'Ciano',
  brown: 'Marrom',
  gray: 'Cinza',
};

/**
 * Fileira de círculos coloridos; o escolhido ganha um anel e um visto.
 *
 * @example
 * <ColorPicker value={color} onChange={setColor} />
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div role='radiogroup' aria-label='Cor' className='flex flex-wrap gap-2.5 px-1'>
      {PALETTE_ORDER.map(color => {
        const active = color === value;
        return (
          <motion.button
            key={color}
            type='button'
            role='radio'
            aria-checked={active}
            aria-label={COLOR_NAMES[color]}
            title={COLOR_NAMES[color]}
            whileTap={{ scale: 0.88 }}
            onClick={() => onChange(color)}
            className={cn('flex size-8 items-center justify-center rounded-full text-white transition-shadow', PALETTE[color].solid, active && 'ring-[3px] ring-offset-2 ring-offset-surface')}
            style={active ? ({ '--tw-ring-color': PALETTE[color].cssVar } as React.CSSProperties) : undefined}
          >
            {active && <Check className='size-4' strokeWidth={3} />}
          </motion.button>
        );
      })}
    </div>
  );
}
