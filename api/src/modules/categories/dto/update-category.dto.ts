/**
 * DTO de edição de categoria.
 *
 * @module modules/categories/dto/update-category.dto
 */
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';

/** Campos editáveis. O tipo (`kind`) não muda: os lançamentos já classificados dependem dele. */
export class UpdateCategoryDto extends PartialType(OmitType(CreateCategoryDto, ['kind'] as const)) {
  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
