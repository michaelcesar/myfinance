/**
 * DTO de edição de lançamento.
 *
 * @module modules/transactions/dto/update-transaction.dto
 */
import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';

/** Todos os campos editáveis; trocar a conta move o lançamento para o livro dela. */
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
