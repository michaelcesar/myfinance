/**
 * Rotas de investimentos.
 *
 * @module modules/investments/investments.controller
 */
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { CurrentUser } from '~/common/decorators';
import { type AuthUser } from '~/common/types/auth-user.type';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { type InvestmentMovement } from './entities/investment-movement.entity';
import { InvestmentsService, type InvestmentWithStats } from './investments.service';

/**
 * Carteira de investimentos e movimentações.
 *
 * @example
 * GET /investments
 */
@ApiTags('investments')
@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  /**
   * Lista os investimentos.
   *
   * @param user - Usuário autenticado
   * @param query - Paginação e filtros
   * @returns Página de investimentos com números derivados
   *
   * @example
   * GET /investments?filter.type=$eq:STOCKS
   */
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Paginate() query: PaginateQuery): Promise<Paginated<InvestmentWithStats>> {
    return this.investmentsService.findAll(user.userId, query);
  }

  /**
   * Busca um investimento.
   *
   * @param user - Usuário autenticado
   * @param investmentId - Id do investimento
   * @returns Investimento
   *
   * @example
   * GET /investments/8f9a...
   */
  @Get(':investmentId')
  findOne(@CurrentUser() user: AuthUser, @Param('investmentId', ParseUUIDPipe) investmentId: string): Promise<InvestmentWithStats> {
    return this.investmentsService.findOne(user.userId, investmentId);
  }

  /**
   * Cadastra um investimento.
   *
   * @param user - Usuário autenticado
   * @param dto - Dados do ativo
   * @returns Investimento criado
   *
   * @example
   * POST /investments { "ledgerId": "...", "name": "Tesouro Selic 2029", "type": "FIXED_INCOME" }
   */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvestmentDto): Promise<InvestmentWithStats> {
    return this.investmentsService.create(user.userId, dto);
  }

  /**
   * Edita um investimento ou atualiza o valor de mercado.
   *
   * @param user - Usuário autenticado
   * @param investmentId - Id do investimento
   * @param dto - Campos alterados
   * @returns Investimento atualizado
   *
   * @example
   * PATCH /investments/8f9a... { "currentValueCents": 1534000, "valuedAt": "2026-11-16" }
   */
  @Patch(':investmentId')
  update(@CurrentUser() user: AuthUser, @Param('investmentId', ParseUUIDPipe) investmentId: string, @Body() dto: UpdateInvestmentDto): Promise<InvestmentWithStats> {
    return this.investmentsService.update(user.userId, investmentId, dto);
  }

  /**
   * Apaga um investimento e tudo que ele gerou.
   *
   * @param user - Usuário autenticado
   * @param investmentId - Id do investimento
   *
   * @example
   * DELETE /investments/8f9a...
   */
  @Delete(':investmentId')
  remove(@CurrentUser() user: AuthUser, @Param('investmentId', ParseUUIDPipe) investmentId: string): Promise<void> {
    return this.investmentsService.remove(user.userId, investmentId);
  }

  /**
   * Lista as movimentações de um investimento.
   *
   * @param user - Usuário autenticado
   * @param investmentId - Id do investimento
   * @param query - Paginação
   * @returns Página de movimentações
   *
   * @example
   * GET /investments/8f9a.../movements
   */
  @Get(':investmentId/movements')
  findMovements(@CurrentUser() user: AuthUser, @Param('investmentId', ParseUUIDPipe) investmentId: string, @Paginate() query: PaginateQuery): Promise<Paginated<InvestmentMovement>> {
    return this.investmentsService.findMovements(user.userId, investmentId, query);
  }

  /**
   * Registra aporte, resgate ou rendimento.
   *
   * @param user - Usuário autenticado
   * @param investmentId - Id do investimento
   * @param dto - Dados da movimentação
   * @returns Investimento atualizado
   *
   * @example
   * POST /investments/8f9a.../movements { "kind": "CONTRIBUTION", "amountCents": 100000, "date": "2026-11-10" }
   */
  @Post(':investmentId/movements')
  addMovement(@CurrentUser() user: AuthUser, @Param('investmentId', ParseUUIDPipe) investmentId: string, @Body() dto: CreateMovementDto): Promise<InvestmentWithStats> {
    return this.investmentsService.addMovement(user.userId, investmentId, dto);
  }

  /**
   * Apaga uma movimentação e desfaz o efeito dela.
   *
   * @param user - Usuário autenticado
   * @param investmentId - Id do investimento
   * @param movementId - Id da movimentação
   * @returns Investimento atualizado
   *
   * @example
   * DELETE /investments/8f9a.../movements/0a1b...
   */
  @Delete(':investmentId/movements/:movementId')
  removeMovement(@CurrentUser() user: AuthUser, @Param('investmentId', ParseUUIDPipe) investmentId: string, @Param('movementId', ParseUUIDPipe) movementId: string): Promise<InvestmentWithStats> {
    return this.investmentsService.removeMovement(user.userId, investmentId, movementId);
  }
}
