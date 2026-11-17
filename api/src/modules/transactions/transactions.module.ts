/**
 * Módulo de lançamentos e transferências.
 *
 * @module modules/transactions/transactions.module
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from '~/modules/accounts/accounts.module';
import { CategoriesModule } from '~/modules/categories/categories.module';
import { Transaction } from './entities/transaction.entity';
import { Transfer } from './entities/transfer.entity';
import { TransactionsController } from './transactions.controller';
import { TransactionLinksService } from './transaction-links.service';
import { TransactionsService } from './transactions.service';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

/** Receitas, despesas e transferências. */
@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Transfer]), AccountsModule, CategoriesModule],
  controllers: [TransactionsController, TransfersController],
  providers: [TransactionsService, TransfersService, TransactionLinksService],
  exports: [TransactionLinksService],
})
export class TransactionsModule {}
