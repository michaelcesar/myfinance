/**
 * Query de período dos painéis.
 *
 * @module modules/dashboard/dto/period-query.dto
 */
import { IsOptional, Matches } from 'class-validator';
import { ISO_DATE_PATTERN } from '~/common/utils';

/** Intervalo opcional; sem ele, vale o mês corrente. */
export class PeriodQueryDto {
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'Data inicial inválida.' })
  from?: string;

  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'Data final inválida.' })
  to?: string;
}
