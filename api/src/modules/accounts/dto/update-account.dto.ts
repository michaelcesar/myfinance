/**
 * DTO de edição de conta.
 *
 * @module modules/accounts/dto/update-account.dto
 */
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAccountDto } from './create-account.dto';

/** Campos editáveis. O livro não muda: os lançamentos da conta são daquele livro. */
export class UpdateAccountDto extends PartialType(OmitType(CreateAccountDto, ['ledgerId'] as const)) {
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
