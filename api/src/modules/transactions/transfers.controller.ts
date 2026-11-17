/**
 * Rotas de transferências.
 *
 * @module modules/transactions/transfers.controller
 */
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '~/common/decorators';
import { type AuthUser } from '~/common/types/auth-user.type';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { TransfersService, type TransferWithLegs } from './transfers.service';

/**
 * Transferências entre contas — inclusive entre livros (pró-labore,
 * distribuição de lucros, aporte de capital). A listagem é a de
 * `/transactions`, que já traz as pernas.
 *
 * @example
 * POST /transfers { "fromAccountId": "...", "toAccountId": "...", "amountCents": 800000, "date": "2026-11-05", "kind": "PRO_LABORE" }
 */
@ApiTags('transfers')
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  /**
   * Busca uma transferência com as pernas.
   *
   * @param user - Usuário autenticado
   * @param transferId - Id da transferência
   * @returns Transferência
   *
   * @example
   * GET /transfers/2b3c...
   */
  @Get(':transferId')
  findOne(@CurrentUser() user: AuthUser, @Param('transferId', ParseUUIDPipe) transferId: string): Promise<TransferWithLegs> {
    return this.transfersService.findOne(user.userId, transferId);
  }

  /**
   * Cria uma transferência.
   *
   * @param user - Usuário autenticado
   * @param dto - Contas, valor, data e motivo
   * @returns Transferência criada
   *
   * @example
   * POST /transfers { ... }
   */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTransferDto): Promise<TransferWithLegs> {
    return this.transfersService.create(user.userId, dto);
  }

  /**
   * Edita uma transferência.
   *
   * @param user - Usuário autenticado
   * @param transferId - Id da transferência
   * @param dto - Campos alterados
   * @returns Transferência atualizada
   *
   * @example
   * PATCH /transfers/2b3c... { "amountCents": 900000 }
   */
  @Patch(':transferId')
  update(@CurrentUser() user: AuthUser, @Param('transferId', ParseUUIDPipe) transferId: string, @Body() dto: UpdateTransferDto): Promise<TransferWithLegs> {
    return this.transfersService.update(user.userId, transferId, dto);
  }

  /**
   * Apaga uma transferência e as duas pernas.
   *
   * @param user - Usuário autenticado
   * @param transferId - Id da transferência
   *
   * @example
   * DELETE /transfers/2b3c...
   */
  @Delete(':transferId')
  remove(@CurrentUser() user: AuthUser, @Param('transferId', ParseUUIDPipe) transferId: string): Promise<void> {
    return this.transfersService.remove(user.userId, transferId);
  }
}
