/**
 * DTO de criação de conta.
 *
 * @module modules/accounts/dto/create-account.dto
 */
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { IsPaletteColor, type PaletteColor } from '~/common/validators';
import { AccountType } from '../enums/account-type.enum';

/** Dados de uma conta nova. */
export class CreateAccountDto {
  @IsUUID('4', { message: 'Escolha o livro da conta.' })
  ledgerId: string;

  @IsString()
  @Length(1, 120, { message: 'Informe o nome da conta.' })
  name: string;

  @IsEnum(AccountType, { message: 'Tipo de conta inválido.' })
  type: AccountType;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  institution?: string | null;

  /** Em centavos; pode ser negativo (fatura de cartão em aberto). */
  @IsOptional()
  @IsInt({ message: 'O saldo inicial precisa ser um valor em centavos.' })
  initialBalanceCents?: number;

  @IsOptional()
  @IsPaletteColor()
  color?: PaletteColor;

  /** Rendimento em % ao ano, até 4 casas; `null` tira a taxa. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'Informe uma taxa entre 0 e 999% ao ano.' })
  @Min(0, { message: 'Informe uma taxa entre 0 e 999% ao ano.' })
  @Max(999.9999, { message: 'Informe uma taxa entre 0 e 999% ao ano.' })
  annualYieldRate?: number | null;
}
