/**
 * Módulo de investimentos.
 *
 * @module modules/investments/investments.module
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '~/modules/accounts/accounts.module';
import { LedgersModule } from '~/modules/ledgers/ledgers.module';
import { Transaction } from '~/modules/transactions/entities/transaction.entity';
import { InvestmentMovement } from './entities/investment-movement.entity';
import { Investment } from './entities/investment.entity';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';

/** Investimentos e movimentações; grava `Transaction` para as pernas na conta. */
@Module({
  imports: [TypeOrmModule.forFeature([Investment, InvestmentMovement, Transaction]), LedgersModule, AccountsModule],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
})
export class InvestmentsModule {}
