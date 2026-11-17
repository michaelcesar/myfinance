/**
 * Rotas de categorias.
 *
 * @module modules/categories/categories.controller
 */
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { CurrentUser } from '~/common/decorators';
import { type AuthUser } from '~/common/types/auth-user.type';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { type Category } from './entities/category.entity';

/**
 * CRUD de categorias.
 *
 * @example
 * GET /categories?filter.kind=$eq:EXPENSE
 */
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Lista as categorias.
   *
   * @param user - Usuário autenticado
   * @param query - Paginação e filtros
   * @returns Página de categorias
   *
   * @example
   * GET /categories
   */
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Paginate() query: PaginateQuery): Promise<Paginated<Category>> {
    return this.categoriesService.findAll(user.userId, query);
  }

  /**
   * Cria uma categoria.
   *
   * @param user - Usuário autenticado
   * @param dto - Dados da categoria
   * @returns Categoria criada
   *
   * @example
   * POST /categories { "kind": "EXPENSE", "name": "Pets" }
   */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.create(user.userId, dto);
  }

  /**
   * Edita uma categoria.
   *
   * @param user - Usuário autenticado
   * @param categoryId - Id da categoria
   * @param dto - Campos alterados
   * @returns Categoria atualizada
   *
   * @example
   * PATCH /categories/1a2b... { "name": "Pet shop" }
   */
  @Patch(':categoryId')
  update(@CurrentUser() user: AuthUser, @Param('categoryId', ParseUUIDPipe) categoryId: string, @Body() dto: UpdateCategoryDto): Promise<Category> {
    return this.categoriesService.update(user.userId, categoryId, dto);
  }

  /**
   * Apaga uma categoria.
   *
   * @param user - Usuário autenticado
   * @param categoryId - Id da categoria
   *
   * @example
   * DELETE /categories/1a2b...
   */
  @Delete(':categoryId')
  remove(@CurrentUser() user: AuthUser, @Param('categoryId', ParseUUIDPipe) categoryId: string): Promise<void> {
    return this.categoriesService.remove(user.userId, categoryId);
  }
}
