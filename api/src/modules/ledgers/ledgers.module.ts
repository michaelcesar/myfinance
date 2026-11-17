/**
 * Módulo de livros.
 *
 * @module modules/ledgers/ledgers.module
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ledger } from './entities/ledger.entity';
import { LedgersController } from './ledgers.controller';
import { LedgersService } from './ledgers.service';

/** Livro pessoal e empresas. Exporta `LedgersService` para validar posse nos demais módulos. */
@Module({
  imports: [TypeOrmModule.forFeature([Ledger])],
  controllers: [LedgersController],
  providers: [LedgersService],
  exports: [LedgersService],
})
export class LedgersModule {}
