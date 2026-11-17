/**
 * Rotas dos painéis.
 *
 * @module modules/dashboard/dashboard.controller
 */
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '~/common/decorators';
import { type AuthUser } from '~/common/types/auth-user.type';
import { resolvePeriod } from '~/common/utils';
import { AnalysisService } from './analysis.service';
import { DashboardService } from './dashboard.service';
import { ForecastQueryDto } from './dto/forecast-query.dto';
import { ForecastService } from './forecast.service';
import { PeriodQueryDto } from './dto/period-query.dto';
import { type Analysis, type Forecast, type Overview, type Summary } from './types/summary.types';

/**
 * Visão geral consolidada e resumo de cada livro.
 *
 * @example
 * GET /dashboard/overview?from=2026-11-01&to=2026-11-30
 */
@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly forecastService: ForecastService,
    private readonly analysisService: AnalysisService
  ) {}

  /**
   * Visão geral: patrimônio, fluxo do período e um bloco por livro.
   *
   * @param user - Usuário autenticado
   * @param query - Período (padrão: mês corrente)
   * @returns Visão geral
   *
   * @example
   * GET /dashboard/overview
   */
  @Get('overview')
  overview(@CurrentUser() user: AuthUser, @Query() query: PeriodQueryDto): Promise<Overview> {
    return this.dashboardService.overview(user.userId, resolvePeriod(query.from, query.to));
  }

  /**
   * Resumo de um livro (o pessoal ou uma empresa).
   *
   * @param user - Usuário autenticado
   * @param ledgerId - Id do livro
   * @param query - Período (padrão: mês corrente)
   * @returns Resumo do livro
   *
   * @example
   * GET /dashboard/ledgers/6f1c...?from=2026-01-01&to=2026-12-31
   */
  @Get('ledgers/:ledgerId')
  ledger(@CurrentUser() user: AuthUser, @Param('ledgerId', ParseUUIDPipe) ledgerId: string, @Query() query: PeriodQueryDto): Promise<Summary> {
    return this.dashboardService.ledgerSummary(user.userId, ledgerId, resolvePeriod(query.from, query.to));
  }

  /**
   * Previsão: realizado no passado, pendentes e projeção dos recorrentes no futuro.
   *
   * @param user - Usuário logado
   * @param query - Meses (`YYYY-MM`) e livro opcionais
   * @returns Previsão do período
   *
   * @example
   * GET /dashboard/forecast?from=2026-11&to=2027-10
   */
  @Get('forecast')
  forecast(@CurrentUser() user: AuthUser, @Query() query: ForecastQueryDto): Promise<Forecast> {
    return this.forecastService.forecast(user.userId, query);
  }

  /**
   * Análise do realizado: gastos, receitas, fixo × variável e avulsos, contra o período anterior.
   *
   * @param user - Usuário logado
   * @param query - Meses (`YYYY-MM`) e livro opcionais
   * @returns Análise do período
   *
   * @example
   * GET /dashboard/analysis?from=2026-06&to=2026-11
   */
  @Get('analysis')
  analysis(@CurrentUser() user: AuthUser, @Query() query: ForecastQueryDto): Promise<Analysis> {
    return this.analysisService.analysis(user.userId, query);
  }
}
