/**
 * DTO de edição de livro.
 *
 * @module modules/ledgers/dto/update-ledger.dto
 */
import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLedgerDto } from './create-ledger.dto';

/** Campos editáveis; `archived` esconde a empresa das listas sem apagar o histórico. */
export class UpdateLedgerDto extends PartialType(CreateLedgerDto) {
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
