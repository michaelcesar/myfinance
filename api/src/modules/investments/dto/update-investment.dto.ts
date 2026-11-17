/**
 * DTO de edição de investimento.
 *
 * @module modules/investments/dto/update-investment.dto
 */
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateInvestmentDto } from './create-investment.dto';

/**
 * Campos editáveis. Mandar `currentValueCents` é a "atualização de valor"
 * (marcação a mercado). O livro não muda.
 */
export class UpdateInvestmentDto extends PartialType(OmitType(CreateInvestmentDto, ['ledgerId'] as const)) {
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
