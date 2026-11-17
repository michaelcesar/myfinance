/**
 * DTO de criação de empresa (livro do tipo `COMPANY`).
 *
 * @module modules/ledgers/dto/create-ledger.dto
 */
import { IsOptional, IsString, Length } from 'class-validator';
import { IsDocument, IsPaletteColor, OnlyDigits, type PaletteColor } from '~/common/validators';

/**
 * Dados de uma empresa do usuário. O livro pessoal nasce no cadastro e não
 * é criado por aqui.
 */
export class CreateLedgerDto {
  @IsString()
  @Length(1, 120, { message: 'Informe o nome da empresa.' })
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  legalName?: string | null;

  @IsOptional()
  @OnlyDigits()
  @IsDocument()
  document?: string | null;

  @IsOptional()
  @IsPaletteColor()
  color?: PaletteColor;
}
