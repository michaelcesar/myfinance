/**
 * Módulo de recorrentes (contratos e contas fixas mensais).
 *
 * @module modules/recurrences/recurrences.module
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsModule } from '~/modules/transactions/transactions.module';
import { RecurrenceSkip } from './entities/recurrence-skip.entity';
import { Recurrence } from './entities/recurrence.entity';
import { RecurrencesController } from './recurrences.controller';
import { RecurrencesCron } from './recurrences.cron';
import { RecurrencesService } from './recurrences.service';

/** Cadastro de recorrentes e geração dos meses pendentes. */
@Module({
  imports: [TypeOrmModule.forFeature([Recurrence, RecurrenceSkip]), TransactionsModule],
  controllers: [RecurrencesController],
  providers: [RecurrencesService, RecurrencesCron],
  exports: [RecurrencesService],
})
export class RecurrencesModule {}
