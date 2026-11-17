/**
 * DTO de criação de recorrente.
 *
 * @module modules/recurrences/dto/create-recurrence.dto
 */
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import { ISO_DATE_PATTERN } from '~/common/utils';
import { MANUAL_KINDS } from '~/modules/transactions/dto/create-transaction.dto';
import { TransactionKind } from '~/modules/transactions/enums/transaction-kind.enum';

/** Contrato ou conta fixa mensal. Os meses chegam como data e são reduzidos ao dia 1. */
export class CreateRecurrenceDto {
  @IsUUID('4', { message: 'Escolha a conta.' })
  accountId: string;

  @IsIn(MANUAL_KINDS, { message: 'O recorrente precisa ser receita ou despesa.' })
  kind: TransactionKind.INCOME | TransactionKind.EXPENSE;

  @IsString()
  @Length(1, 200, { message: 'Informe uma descrição.' })
  description: string;

  @IsInt({ message: 'O valor precisa estar em centavos.' })
  @Min(1, { message: 'O valor precisa ser maior que zero.' })
  amountCents: number;

  @IsInt({ message: 'Informe um dia entre 1 e 31.' })
  @Min(1, { message: 'Informe um dia entre 1 e 31.' })
  @Max(31, { message: 'Informe um dia entre 1 e 31.' })
  dayOfMonth: number;

  @IsOptional()
  @IsInt({ message: 'Informe um dia entre 1 e 31.' })
  @Min(1, { message: 'Informe um dia entre 1 e 31.' })
  @Max(31, { message: 'Informe um dia entre 1 e 31.' })
  dayOfMonthStart?: number | null;

  @Matches(ISO_DATE_PATTERN, { message: 'Informe o mês de início.' })
  startMonth: string;

  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'Mês de fim inválido.' })
  endMonth?: string | null;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string | null;
}
