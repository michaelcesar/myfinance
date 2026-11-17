/**
 * Tarefa agendada dos recorrentes.
 *
 * @module modules/recurrences/recurrences.cron
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RecurrencesService } from './recurrences.service';

/** Gera, todo dia de madrugada, os meses que entraram na janela. */
@Injectable()
export class RecurrencesCron {
  private readonly logger = new Logger(RecurrencesCron.name);

  constructor(private readonly recurrencesService: RecurrencesService) {}

  /**
   * Executa a geração para todos os usuários.
   *
   * @example
   * await recurrencesCron.run();
   */
  @Cron('10 3 * * *')
  async run(): Promise<void> {
    const created = await this.recurrencesService.materialize();
    this.logger.log(`Lançamentos recorrentes criados: ${created}`);
  }
}
