/**
 * DTO de movimentação de investimento.
 *
 * @module modules/investments/dto/create-movement.dto
 */
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Min } from 'class-validator';
import { ISO_DATE_PATTERN } from '~/common/utils';
import { MovementKind } from '../enums/movement-kind.enum';

/** Aporte, resgate ou rendimento. */
export class CreateMovementDto {
  @IsEnum(MovementKind, { message: 'Tipo de movimentação inválido.' })
  kind: MovementKind;

  @IsInt({ message: 'O valor precisa estar em centavos.' })
  @Min(1, { message: 'O valor precisa ser maior que zero.' })
  amountCents: number;

  @Matches(ISO_DATE_PATTERN, { message: 'Data inválida.' })
  date: string;

  /** Conta de origem do aporte ou destino do resgate; ignorada em rendimento. */
  @IsOptional()
  @IsUUID('4')
  accountId?: string | null;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string | null;
}
