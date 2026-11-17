/**
 * Módulo de health check.
 *
 * @module modules/health/health.module
 */
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** Rota pública de saúde. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
