/**
 * DTO de criação de lançamento (receita ou despesa).
 *
 * @module modules/transactions/dto/create-transaction.dto
 */
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Min } from 'class-validator';
import { ISO_DATE_PATTERN } from '~/common/utils';
import { TransactionKind } from '../enums/transaction-kind.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';

/** Tipos aceitos aqui; transferências têm rota própria (`/transfers`). */
export const MANUAL_KINDS = [TransactionKind.INCOME, TransactionKind.EXPENSE] as const;

/** Dados de um lançamento manual. O livro vem da conta. */
export class CreateTransactionDto {
  @IsUUID('4', { message: 'Escolha a conta.' })
  accountId: string;

  @IsIn(MANUAL_KINDS, { message: 'O lançamento precisa ser receita ou despesa.' })
  kind: TransactionKind.INCOME | TransactionKind.EXPENSE;

  @IsInt({ message: 'O valor precisa estar em centavos.' })
  @Min(1, { message: 'O valor precisa ser maior que zero.' })
  amountCents: number;

  @Matches(ISO_DATE_PATTERN, { message: 'Data inválida.' })
  date: string;

  @IsString()
  @Length(1, 200, { message: 'Informe uma descrição.' })
  description: string;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string | null;
}
