/**
 * Rotas de recorrentes.
 *
 * @module modules/recurrences/recurrences.controller
 */
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { CurrentUser } from '~/common/decorators';
import { type AuthUser } from '~/common/types/auth-user.type';
import { CreateRecurrenceDto } from './dto/create-recurrence.dto';
import { UpdateRecurrenceDto } from './dto/update-recurrence.dto';
import { type RecurrenceView, RecurrencesService } from './recurrences.service';

/** CRUD de recorrentes do usuário logado. */
@ApiTags('recurrences')
@Controller('recurrences')
export class RecurrencesController {
  constructor(private readonly recurrencesService: RecurrencesService) {}

  /**
   * Lista os recorrentes.
   *
   * @param user - Usuário logado
   * @param query - Paginação e filtros
   * @returns Página de recorrentes
   *
   * @example
   * GET /recurrences?filter.ledgerId=$eq:6f1c...
   */
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Paginate() query: PaginateQuery): Promise<Paginated<RecurrenceView>> {
    return this.recurrencesService.findAll(user.userId, query);
  }

  /**
   * Busca um recorrente.
   *
   * @param user - Usuário logado
   * @param recurrenceId - Id do recorrente
   * @returns Recorrente
   *
   * @example
   * GET /recurrences/5d6e...
   */
  @Get(':recurrenceId')
  findOne(@CurrentUser() user: AuthUser, @Param('recurrenceId', ParseUUIDPipe) recurrenceId: string): Promise<RecurrenceView> {
    return this.recurrencesService.findOne(user.userId, recurrenceId);
  }

  /**
   * Cria um recorrente.
   *
   * @param user - Usuário logado
   * @param dto - Dados do recorrente
   * @returns Recorrente criado
   *
   * @example
   * POST /recurrences { "accountId": "...", "kind": "INCOME", "description": "Contrato Acme", "amountCents": 900000, "dayOfMonth": 10, "startMonth": "2026-11-01" }
   */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRecurrenceDto): Promise<RecurrenceView> {
    return this.recurrencesService.create(user.userId, dto);
  }

  /**
   * Edita um recorrente.
   *
   * @param user - Usuário logado
   * @param recurrenceId - Id do recorrente
   * @param dto - Campos alterados
   * @returns Recorrente atualizado
   *
   * @example
   * PATCH /recurrences/5d6e... { "amountCents": 950000 }
   */
  @Patch(':recurrenceId')
  update(@CurrentUser() user: AuthUser, @Param('recurrenceId', ParseUUIDPipe) recurrenceId: string, @Body() dto: UpdateRecurrenceDto): Promise<RecurrenceView> {
    return this.recurrencesService.update(user.userId, recurrenceId, dto);
  }

  /**
   * Apaga um recorrente.
   *
   * @param user - Usuário logado
   * @param recurrenceId - Id do recorrente
   *
   * @example
   * DELETE /recurrences/5d6e...
   */
  @Delete(':recurrenceId')
  remove(@CurrentUser() user: AuthUser, @Param('recurrenceId', ParseUUIDPipe) recurrenceId: string): Promise<void> {
    return this.recurrencesService.remove(user.userId, recurrenceId);
  }
}
