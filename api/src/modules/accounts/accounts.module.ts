/**
 * Módulo de contas.
 *
 * @module modules/accounts/accounts.module
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgersModule } from '~/modules/ledgers/ledgers.module';
import { Transaction } from '~/modules/transactions/entities/transaction.entity';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { Account } from './entities/account.entity';

/** Contas e saldos. Lê `Transaction` só para somar o saldo. */
@Module({
  imports: [TypeOrmModule.forFeature([Account, Transaction]), LedgersModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
