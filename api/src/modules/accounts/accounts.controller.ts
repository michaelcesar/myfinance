/**
 * Rotas de contas.
 *
 * @module modules/accounts/accounts.controller
 */
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { CurrentUser } from '~/common/decorators';
import { type AuthUser } from '~/common/types/auth-user.type';
import { AccountsService, type AccountWithBalance } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

/**
 * CRUD de contas, sempre com o saldo calculado.
 *
 * @example
 * GET /accounts?filter.ledgerId=$eq:6f1c...
 */
@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * Lista as contas.
   *
   * @param user - Usuário autenticado
   * @param query - Paginação e filtros
   * @returns Página de contas com saldo
   *
   * @example
   * GET /accounts
   */
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Paginate() query: PaginateQuery): Promise<Paginated<AccountWithBalance>> {
    return this.accountsService.findAll(user.userId, query);
  }

  /**
   * Busca uma conta.
   *
   * @param user - Usuário autenticado
   * @param accountId - Id da conta
   * @returns Conta com saldo
   *
   * @example
   * GET /accounts/9c2d...
   */
  @Get(':accountId')
  findOne(@CurrentUser() user: AuthUser, @Param('accountId', ParseUUIDPipe) accountId: string): Promise<AccountWithBalance> {
    return this.accountsService.findOne(user.userId, accountId);
  }

  /**
   * Cria uma conta.
   *
   * @param user - Usuário autenticado
   * @param dto - Dados da conta
   * @returns Conta criada
   *
   * @example
   * POST /accounts { "ledgerId": "...", "name": "Nubank", "type": "CHECKING" }
   */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAccountDto): Promise<AccountWithBalance> {
    return this.accountsService.create(user.userId, dto);
  }

  /**
   * Edita uma conta.
   *
   * @param user - Usuário autenticado
   * @param accountId - Id da conta
   * @param dto - Campos alterados
   * @returns Conta atualizada
   *
   * @example
   * PATCH /accounts/9c2d... { "name": "Nubank PF" }
   */
  @Patch(':accountId')
  update(@CurrentUser() user: AuthUser, @Param('accountId', ParseUUIDPipe) accountId: string, @Body() dto: UpdateAccountDto): Promise<AccountWithBalance> {
    return this.accountsService.update(user.userId, accountId, dto);
  }

  /**
   * Apaga uma conta sem lançamentos.
   *
   * @param user - Usuário autenticado
   * @param accountId - Id da conta
   *
   * @example
   * DELETE /accounts/9c2d...
   */
  @Delete(':accountId')
  remove(@CurrentUser() user: AuthUser, @Param('accountId', ParseUUIDPipe) accountId: string): Promise<void> {
    return this.accountsService.remove(user.userId, accountId);
  }
}
