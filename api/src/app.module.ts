/**
 * Módulo raiz da API.
 *
 * @module app.module
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard } from '~/common/guards/auth.guard';
import { buildDatabaseOptions } from '~/config/database.config';
import { type Env, validateEnv } from '~/config/env.validation';
import { AccountsModule } from '~/modules/accounts/accounts.module';
import { AuthModule } from '~/modules/auth/auth.module';
import { BackupModule } from '~/modules/backup/backup.module';
import { CategoriesModule } from '~/modules/categories/categories.module';
import { DashboardModule } from '~/modules/dashboard/dashboard.module';
import { HealthModule } from '~/modules/health/health.module';
import { InvestmentsModule } from '~/modules/investments/investments.module';
import { LedgersModule } from '~/modules/ledgers/ledgers.module';
import { RecurrencesModule } from '~/modules/recurrences/recurrences.module';
import { TransactionsModule } from '~/modules/transactions/transactions.module';
import { UsersModule } from '~/modules/users/users.module';

/**
 * Liga configuração validada, banco, JWT, limite de requisições e os
 * módulos de domínio. Guards globais, nesta ordem: `ThrottlerGuard` e
 * `AuthGuard` (toda rota nasce autenticada — `ADR-004`).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        ...buildDatabaseOptions({
          url: config.get('POSTGRES_URI', { infer: true }),
          logging: config.get('TYPEORM_LOG', { infer: true }),
          synchronize: config.get('NODE_ENV', { infer: true }) !== 'production' && config.get('TYPEORM_SYNC', { infer: true }),
        }),
        autoLoadEntities: true,
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('APP_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }) },
      }),
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    ScheduleModule.forRoot(),
    HealthModule,
    UsersModule,
    AuthModule,
    BackupModule,
    LedgersModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    RecurrencesModule,
    InvestmentsModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
