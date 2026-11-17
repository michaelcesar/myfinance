/**
 * Bloco neutro com ícone ou iniciais, que abre linhas de lista e itens de menu.
 *
 * @module components/ui/IconTile
 */
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Propriedades do bloco. */
export interface IconTileProps {
  icon?: LucideIcon;
  text?: string;
  /** `neutral` (cinza, padrão) ou `inverted` (preto no claro, para destaque). */
  tone?: 'neutral' | 'inverted';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Tamanho e raio de cada bloco — o `IconTileSkeleton` usa os mesmos. */
export const ICON_TILE_SHAPES = {
  sm: 'size-7 rounded-md',
  md: 'size-9 rounded-control',
  lg: 'size-12 rounded-xl',
} as const;

const SIZES = {
  sm: `${ICON_TILE_SHAPES.sm} text-caption-2 [&_svg]:size-[15px]`,
  md: `${ICON_TILE_SHAPES.md} text-footnote [&_svg]:size-[19px]`,
  lg: `${ICON_TILE_SHAPES.lg} text-callout [&_svg]:size-[24px]`,
} as const;

const TONES = {
  neutral: 'bg-fill-2 text-fg',
  inverted: 'bg-inverted text-inverted-fg',
} as const;

/**
 * Quadrado arredondado em tons de cinza com ícone ou iniciais.
 *
 * @example
 * <IconTile icon={ShoppingCart} />
 * <IconTile text='SA' size='lg' tone='inverted' />
 */
export function IconTile({ icon: Icon, text, tone = 'neutral', size = 'md', className }: IconTileProps) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center font-semibold', TONES[tone], SIZES[size], className)} aria-hidden>
      {Icon ? <Icon strokeWidth={2} /> : text}
    </span>
  );
}
