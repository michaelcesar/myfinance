/**
 * DTO de criação de investimento.
 *
 * @module modules/investments/dto/create-investment.dto
 */
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Min } from 'class-validator';
import { ISO_DATE_PATTERN } from '~/common/utils';
import { InvestmentType } from '../enums/investment-type.enum';

/** Dados de um ativo novo. O valor entra pelos aportes ou por uma atualização. */
export class CreateInvestmentDto {
  @IsUUID('4', { message: 'Escolha o livro do investimento.' })
  ledgerId: string;

  @IsString()
  @Length(1, 160, { message: 'Informe o nome do investimento.' })
  name: string;

  @IsEnum(InvestmentType, { message: 'Classe de investimento inválida.' })
  type: InvestmentType;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  institution?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'O valor atual não pode ser negativo.' })
  currentValueCents?: number;

  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'Data inválida.' })
  valuedAt?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string | null;
}
