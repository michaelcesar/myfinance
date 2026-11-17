/**
 * Cores aceitas para livros, contas, categorias e contratantes.
 *
 * @module common/validators/palette-color.validator
 */
import { IsIn, type ValidationOptions } from 'class-validator';

/**
 * Nomes da paleta do front (cores de sistema da Apple). A API guarda o
 * nome, nunca um hex — o tom muda entre tema claro e escuro.
 */
export const PALETTE_COLORS = ['blue', 'green', 'indigo', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow', 'mint', 'cyan', 'brown', 'gray'] as const;

/** Nome de cor válido da paleta. */
export type PaletteColor = (typeof PALETTE_COLORS)[number];

/**
 * Restringe o campo aos nomes de `PALETTE_COLORS`.
 *
 * @param options - Opções do class-validator
 * @returns Decorator de propriedade
 *
 * @example
 * @IsOptional()
 * @IsPaletteColor()
 * color?: PaletteColor;
 */
export function IsPaletteColor(options?: ValidationOptions): PropertyDecorator {
  return IsIn(PALETTE_COLORS, { message: 'Cor fora da paleta.', ...options });
}
