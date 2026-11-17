/**
 * Selo que liga e desliga uma opção da tela (ex.: "Incluir bens").
 *
 * @module components/ui/ToggleBadge
 */
'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Caixa do selo; o estado aparece no preenchimento e no ícone, não só na cor. */
const TOGGLE_BADGE_CLASS =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring';

/** Desligado: contorno discreto. */
const TOGGLE_BADGE_OFF_CLASS = 'bg-transparent text-fg-muted ring-border hover:bg-fill-2';

/** Ligado: preenchido, com ícone de marcado. */
const TOGGLE_BADGE_ON_CLASS = 'bg-primary text-primary-fg ring-primary';

/** Propriedades do selo. */
export interface ToggleBadgeProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: ReactNode;
  className?: string;
}

/**
 * Selo de ligar/desligar, com `aria-pressed`.
 *
 * @example
 * <ToggleBadge pressed={includeAssets} onPressedChange={setIncludeAssets}>Incluir bens</ToggleBadge>
 */
export function ToggleBadge({ pressed, onPressedChange, children, className }: ToggleBadgeProps) {
  return (
    <button type='button' aria-pressed={pressed} onClick={() => onPressedChange(!pressed)} className={cn(TOGGLE_BADGE_CLASS, pressed ? TOGGLE_BADGE_ON_CLASS : TOGGLE_BADGE_OFF_CLASS, className)}>
      {pressed && <Check className='size-3.5' aria-hidden />}
      {children}
    </button>
  );
}
