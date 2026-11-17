/**
 * Query da previsão.
 *
 * @module modules/dashboard/dto/forecast-query.dto
 */
import { IsOptional, IsUUID, Matches } from 'class-validator';

/** Mês no formato `YYYY-MM`. */
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Período em meses e livro; sem período, vale de 11 meses atrás até 12 à frente. */
export class ForecastQueryDto {
  @IsOptional()
  @Matches(MONTH_PATTERN, { message: 'Mês inicial inválido.' })
  from?: string;

  @IsOptional()
  @Matches(MONTH_PATTERN, { message: 'Mês final inválido.' })
  to?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Livro inválido.' })
  ledgerId?: string;
}
