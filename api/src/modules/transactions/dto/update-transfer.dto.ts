/**
 * DTO de edição de transferência.
 *
 * @module modules/transactions/dto/update-transfer.dto
 */
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateTransferDto } from './create-transfer.dto';

/** As contas não mudam: para trocar origem ou destino, apague e crie outra. */
export class UpdateTransferDto extends PartialType(OmitType(CreateTransferDto, ['fromAccountId', 'toAccountId'] as const)) {}
