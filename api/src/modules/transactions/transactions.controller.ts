/**
 * Rotas de lançamentos.
 *
 * @module modules/transactions/transactions.controller
 */
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { CurrentUser } from '~/common/decorators';
import { type AuthUser } from '~/common/types/auth-user.type';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { type Transaction } from './entities/transaction.entity';
import { TransactionsService } from './transactions.service';

/**
 * Receitas e despesas. A listagem inclui as pernas de transferência.
 *
 * @example
 * GET /transactions?filter.date=$btw:2026-11-01,2026-11-30
 */
@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Lista os lançamentos.
   *
   * @param user - Usuário autenticado
   * @param query - Paginação, busca e filtros
   * @returns Página de lançamentos
   *
   * @example
   * GET /transactions?filter.kind=$eq:EXPENSE
   */
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Paginate() query: PaginateQuery): Promise<Paginated<Transaction>> {
    return this.transactionsService.findAll(user.userId, query);
  }

  /**
   * Busca um lançamento.
   *
   * @param user - Usuário autenticado
   * @param transactionId - Id do lançamento
   * @returns Lançamento
   *
   * @example
   * GET /transactions/5d6e...
   */
  @Get(':transactionId')
  findOne(@CurrentUser() user: AuthUser, @Param('transactionId', ParseUUIDPipe) transactionId: string): Promise<Transaction> {
    return this.transactionsService.findOne(user.userId, transactionId);
  }

  /**
   * Cria uma receita ou despesa.
   *
   * @param user - Usuário autenticado
   * @param dto - Dados do lançamento
   * @returns Lançamento criado
   *
   * @example
   * POST /transactions { "accountId": "...", "kind": "EXPENSE", "amountCents": 4590, "date": "2026-11-14", "description": "Farmácia" }
   */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTransactionDto): Promise<Transaction> {
    return this.transactionsService.create(user.userId, dto);
  }

  /**
   * Edita uma receita ou despesa.
   *
   * @param user - Usuário autenticado
   * @param transactionId - Id do lançamento
   * @param dto - Campos alterados
   * @returns Lançamento atualizado
   *
   * @example
   * PATCH /transactions/5d6e... { "status": "PAID" }
   */
  @Patch(':transactionId')
  update(@CurrentUser() user: AuthUser, @Param('transactionId', ParseUUIDPipe) transactionId: string, @Body() dto: UpdateTransactionDto): Promise<Transaction> {
    return this.transactionsService.update(user.userId, transactionId, dto);
  }

  /**
   * Apaga uma receita ou despesa.
   *
   * @param user - Usuário autenticado
   * @param transactionId - Id do lançamento
   *
   * @example
   * DELETE /transactions/5d6e...
   */
  @Delete(':transactionId')
  remove(@CurrentUser() user: AuthUser, @Param('transactionId', ParseUUIDPipe) transactionId: string): Promise<void> {
    return this.transactionsService.remove(user.userId, transactionId);
  }
}
