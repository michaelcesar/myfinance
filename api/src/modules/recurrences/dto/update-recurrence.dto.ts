/**
 * DTO de edição de recorrente.
 *
 * @module modules/recurrences/dto/update-recurrence.dto
 */
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateRecurrenceDto } from './create-recurrence.dto';

/** Campos editáveis; o tipo (receita ou despesa) não muda depois de criado. */
export class UpdateRecurrenceDto extends PartialType(OmitType(CreateRecurrenceDto, ['kind'] as const)) {}
