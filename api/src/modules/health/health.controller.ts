/**
 * Verificação de saúde da API.
 *
 * @module modules/health/health.controller
 */
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '~/common/decorators';

/**
 * Responde se a API e o banco estão de pé.
 *
 * @example
 * GET /health
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * PUBLIC ENDPOINT — intentionally unauthenticated.
   * Motivo: consultado por orquestrador e monitoramento, que não têm sessão.
   *
   * @returns `{ status: 'ok' }`
   * @throws `ServiceUnavailableException` se o banco não responder
   *
   * @example
   * GET /health
   */
  @Public()
  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível.');
    }
  }
}
