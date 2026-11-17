/**
 * DTO de criação de categoria.
 *
 * @module modules/categories/dto/create-category.dto
 */
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { IsPaletteColor, type PaletteColor } from '~/common/validators';
import { LedgerType } from '~/modules/ledgers/enums/ledger-type.enum';
import { CategoryKind } from '../enums/category-kind.enum';

/** Dados de uma categoria nova. */
export class CreateCategoryDto {
  @IsEnum(CategoryKind, { message: 'Tipo de categoria inválido.' })
  kind: CategoryKind;

  @IsString()
  @Length(1, 80, { message: 'Informe o nome da categoria.' })
  name: string;

  @IsOptional()
  @IsPaletteColor()
  color?: PaletteColor;

  /** Nome kebab-case de um ícone do `lucide-react`. */
  @IsOptional()
  @Matches(/^[a-z0-9-]{1,40}$/, { message: 'Ícone inválido.' })
  icon?: string;

  @IsOptional()
  @IsEnum(LedgerType)
  ledgerType?: LedgerType | null;
}
