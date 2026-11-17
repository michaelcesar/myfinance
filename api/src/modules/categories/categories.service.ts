/**
 * Serviço de categorias.
 *
 * @module modules/categories/categories.service
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { type EntityManager, Repository } from 'typeorm';
import { findOwnedOrFail } from '~/common/utils';
import { DEFAULT_CATEGORIES } from './default-categories';
import { type CreateCategoryDto } from './dto/create-category.dto';
import { type UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

/**
 * CRUD de categorias e criação das padrões no cadastro.
 *
 * @example
 * await categoriesService.create(userId, { kind: CategoryKind.EXPENSE, name: 'Pets' });
 */
@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(Category) private readonly repo: Repository<Category>) {}

  /**
   * Lista as categorias do usuário.
   *
   * @param userId - Dono
   * @param query - Paginação, filtros (`kind`, `ledgerType`, `archived`) e busca
   * @returns Página de categorias
   *
   * @example
   * GET /categories?filter.kind=$eq:EXPENSE
   */
  findAll(userId: string, query: PaginateQuery): Promise<Paginated<Category>> {
    return paginate(query, this.repo, {
      where: { userId },
      sortableColumns: ['name', 'kind', 'createdAt'],
      defaultSortBy: [['name', 'ASC']],
      searchableColumns: ['name'],
      filterableColumns: { kind: [FilterOperator.EQ], ledgerType: [FilterOperator.EQ, FilterOperator.NULL], archived: [FilterOperator.EQ] },
      defaultLimit: 100,
      maxLimit: 100,
    });
  }

  /**
   * Busca uma categoria do usuário.
   *
   * @param userId - Dono
   * @param categoryId - Id da categoria
   * @returns Categoria
   * @throws `NotFoundException` se não existir ou for de outro usuário
   *
   * @example
   * await categoriesService.findOne(userId, categoryId);
   */
  findOne(userId: string, categoryId: string): Promise<Category> {
    return findOwnedOrFail(this.repo, { userId, categoryId }, 'Categoria não encontrada.');
  }

  /**
   * Cria as categorias padrão de um usuário novo.
   *
   * @param manager - Gerenciador da transação do cadastro
   * @param userId - Novo usuário
   *
   * @example
   * await categoriesService.seedDefaults(manager, user.userId);
   */
  async seedDefaults(manager: EntityManager, userId: string): Promise<void> {
    const repo = manager.getRepository(Category);
    await repo.save(DEFAULT_CATEGORIES.map(category => repo.create({ ...category, userId })));
  }

  /**
   * Cria uma categoria.
   *
   * @param userId - Dono
   * @param dto - Dados da categoria
   * @returns Categoria criada
   *
   * @example
   * await categoriesService.create(userId, { kind: CategoryKind.INCOME, name: 'Royalties' });
   */
  create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    return this.repo.save(this.repo.create({ ...dto, name: dto.name.trim(), userId }));
  }

  /**
   * Edita uma categoria.
   *
   * @param userId - Dono
   * @param categoryId - Id da categoria
   * @param dto - Campos alterados
   * @returns Categoria atualizada
   *
   * @example
   * await categoriesService.update(userId, categoryId, { color: 'red' });
   */
  async update(userId: string, categoryId: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(userId, categoryId);
    Object.assign(category, dto);
    return this.repo.save(category);
  }

  /**
   * Apaga uma categoria. Os lançamentos dela ficam sem categoria (`SET NULL`).
   *
   * @param userId - Dono
   * @param categoryId - Id da categoria
   *
   * @example
   * await categoriesService.remove(userId, categoryId);
   */
  async remove(userId: string, categoryId: string): Promise<void> {
    const category = await this.findOne(userId, categoryId);
    await this.repo.remove(category);
  }
}
