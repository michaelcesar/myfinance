/**
 * Módulo dos painéis.
 *
 * @module modules/dashboard/dashboard.module
 */
import { Module } from '@nestjs/common';
import { LedgersModule } from '~/modules/ledgers/ledgers.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AnalysisService } from './analysis.service';
import { ForecastService } from './forecast.service';

/** Agregações somente leitura sobre lançamentos, contas e investimentos. */
@Module({
  imports: [LedgersModule],
  controllers: [DashboardController],
  providers: [DashboardService, ForecastService, AnalysisService],
})
export class DashboardModule {}
