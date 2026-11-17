/**
 * Cores de identificação que o usuário escolhe (conta, categoria, empresa).
 *
 * A API guarda o nome (`'green'`); aqui o nome vira classes do Tailwind
 * apontando para os tokens de `globals.css`, que já mudam com o tema.
 * Classes completas, escritas por extenso, para o Tailwind encontrá-las.
 *
 * @module lib/palette
 */
import type { PaletteColor } from '@/types/entities';

/** Classes de uma cor: texto, fundo sólido, fundo suave e variável CSS. */
export interface PaletteClasses {
  text: string;
  solid: string;
  soft: string;
  cssVar: string;
}

export const PALETTE: Record<PaletteColor, PaletteClasses> = {
  blue: { text: 'text-palette-blue', solid: 'bg-palette-blue', soft: 'bg-palette-blue/12', cssVar: 'var(--color-palette-blue)' },
  green: { text: 'text-palette-green', solid: 'bg-palette-green', soft: 'bg-palette-green/12', cssVar: 'var(--color-palette-green)' },
  indigo: { text: 'text-palette-indigo', solid: 'bg-palette-indigo', soft: 'bg-palette-indigo/12', cssVar: 'var(--color-palette-indigo)' },
  orange: { text: 'text-palette-orange', solid: 'bg-palette-orange', soft: 'bg-palette-orange/12', cssVar: 'var(--color-palette-orange)' },
  pink: { text: 'text-palette-pink', solid: 'bg-palette-pink', soft: 'bg-palette-pink/12', cssVar: 'var(--color-palette-pink)' },
  purple: { text: 'text-palette-purple', solid: 'bg-palette-purple', soft: 'bg-palette-purple/12', cssVar: 'var(--color-palette-purple)' },
  red: { text: 'text-palette-red', solid: 'bg-palette-red', soft: 'bg-palette-red/12', cssVar: 'var(--color-palette-red)' },
  teal: { text: 'text-palette-teal', solid: 'bg-palette-teal', soft: 'bg-palette-teal/12', cssVar: 'var(--color-palette-teal)' },
  yellow: { text: 'text-palette-yellow', solid: 'bg-palette-yellow', soft: 'bg-palette-yellow/15', cssVar: 'var(--color-palette-yellow)' },
  mint: { text: 'text-palette-mint', solid: 'bg-palette-mint', soft: 'bg-palette-mint/12', cssVar: 'var(--color-palette-mint)' },
  cyan: { text: 'text-palette-cyan', solid: 'bg-palette-cyan', soft: 'bg-palette-cyan/12', cssVar: 'var(--color-palette-cyan)' },
  brown: { text: 'text-palette-brown', solid: 'bg-palette-brown', soft: 'bg-palette-brown/12', cssVar: 'var(--color-palette-brown)' },
  gray: { text: 'text-palette-gray', solid: 'bg-palette-gray', soft: 'bg-palette-gray/12', cssVar: 'var(--color-palette-gray)' },
};

/** Ordem de exibição no seletor de cor. */
export const PALETTE_ORDER: PaletteColor[] = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'brown', 'gray'];

/**
 * Resolve as classes de uma cor, caindo em cinza para nome desconhecido.
 *
 * @param color - Nome da cor
 * @returns Classes da cor
 */
export function palette(color: string | null | undefined): PaletteClasses {
  return PALETTE[(color ?? 'gray') as PaletteColor] ?? PALETTE.gray;
}
