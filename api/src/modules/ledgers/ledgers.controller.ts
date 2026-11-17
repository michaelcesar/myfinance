/**
 * Rotas de livros (pessoal e empresas).
 *
 * @module modules/ledgers/ledgers.controller
 */
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { CurrentUser } from '~/common/decorators';
import { type AuthUser } from '~/common/types/auth-user.type';
import { CreateLedgerDto } from './dto/create-ledger.dto';
import { UpdateLedgerDto } from './dto/update-ledger.dto';
import { type Ledger } from './entities/ledger.entity';
import { LedgersService } from './ledgers.service';

/**
 * CRUD de livros. `POST` sempre cria uma empresa.
 *
 * @example
 * GET /ledgers
 */
@ApiTags('ledgers')
@Controller('ledgers')
export class LedgersController {
  constructor(private readonly ledgersService: LedgersService) {}

  /**
   * Lista os livros do usuário.
   *
   * @param user - Usuário autenticado
   * @param query - Paginação e filtros
   * @returns Página de livros
   *
   * @example
   * GET /ledgers?filter.archived=$eq:false
   */
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Paginate() query: PaginateQuery): Promise<Paginated<Ledger>> {
    return this.ledgersService.findAll(user.userId, query);
  }

  /**
   * Busca um livro.
   *
   * @param user - Usuário autenticado
   * @param ledgerId - Id do livro
   * @returns Livro
   *
   * @example
   * GET /ledgers/6f1c...
   */
  @Get(':ledgerId')
  findOne(@CurrentUser() user: AuthUser, @Param('ledgerId', ParseUUIDPipe) ledgerId: string): Promise<Ledger> {
    return this.ledgersService.findOne(user.userId, ledgerId);
  }

  /**
   * Cadastra uma empresa.
   *
   * @param user - Usuário autenticado
   * @param dto - Dados da empresa
   * @returns Empresa criada
   *
   * @example
   * POST /ledgers { "name": "Studio Ltda" }
   */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLedgerDto): Promise<Ledger> {
    return this.ledgersService.create(user.userId, dto);
  }

  /**
   * Edita um livro.
   *
   * @param user - Usuário autenticado
   * @param ledgerId - Id do livro
   * @param dto - Campos alterados
   * @returns Livro atualizado
   *
   * @example
   * PATCH /ledgers/6f1c... { "color": "green" }
   */
  @Patch(':ledgerId')
  update(@CurrentUser() user: AuthUser, @Param('ledgerId', ParseUUIDPipe) ledgerId: string, @Body() dto: UpdateLedgerDto): Promise<Ledger> {
    return this.ledgersService.update(user.userId, ledgerId, dto);
  }

  /**
   * Apaga uma empresa sem movimentação.
   *
   * @param user - Usuário autenticado
   * @param ledgerId - Id do livro
   *
   * @example
   * DELETE /ledgers/6f1c...
   */
  @Delete(':ledgerId')
  remove(@CurrentUser() user: AuthUser, @Param('ledgerId', ParseUUIDPipe) ledgerId: string): Promise<void> {
    return this.ledgersService.remove(user.userId, ledgerId);
  }
}
