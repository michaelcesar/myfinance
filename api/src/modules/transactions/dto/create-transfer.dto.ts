/**
 * DTO de criação de transferência.
 *
 * @module modules/transactions/dto/create-transfer.dto
 */
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Min } from 'class-validator';
import { ISO_DATE_PATTERN } from '~/common/utils';
import { TransferKind } from '../enums/transfer-kind.enum';

/** Dados de uma transferência entre duas contas do usuário. */
export class CreateTransferDto {
  @IsUUID('4', { message: 'Escolha a conta de origem.' })
  fromAccountId: string;

  @IsUUID('4', { message: 'Escolha a conta de destino.' })
  toAccountId: string;

  @IsInt({ message: 'O valor precisa estar em centavos.' })
  @Min(1, { message: 'O valor precisa ser maior que zero.' })
  amountCents: number;

  @Matches(ISO_DATE_PATTERN, { message: 'Data inválida.' })
  date: string;

  @IsOptional()
  @IsEnum(TransferKind, { message: 'Motivo da transferência inválido.' })
  kind?: TransferKind;

  /** Sem descrição, usa o nome do motivo ("Pró-labore", "Transferência"...). */
  @IsOptional()
  @IsString()
  @Length(1, 200)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string | null;
}
