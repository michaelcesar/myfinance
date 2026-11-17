/**
 * Serviço de livros (pessoal e empresas).
 *
 * @module modules/ledgers/ledgers.service
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { type EntityManager, Repository } from 'typeorm';
import { findOwnedOrFail } from '~/common/utils';
import { type CreateLedgerDto } from './dto/create-ledger.dto';
import { type UpdateLedgerDto } from './dto/update-ledger.dto';
import { Ledger } from './entities/ledger.entity';
import { LedgerType } from './enums/ledger-type.enum';

/**
 * CRUD de livros. O livro pessoal é criado no cadastro e não pode ser
 * arquivado nem apagado; empresas podem.
 *
 * @example
 * const company = await ledgersService.create(userId, { name: 'Studio Ltda' });
 */
@Injectable()
export class LedgersService {
  private readonly logger = new Logger(LedgersService.name);

  constructor(@InjectRepository(Ledger) private readonly repo: Repository<Ledger>) {}

  /**
   * Lista os livros do usuário, pessoal primeiro.
   *
   * @param userId - Dono dos livros
   * @param query - Paginação, filtros (`type`, `archived`) e busca por nome
   * @returns Página de livros
   *
   * @example
   * GET /ledgers?filter.type=$eq:COMPANY
   */
  findAll(userId: string, query: PaginateQuery): Promise<Paginated<Ledger>> {
    return paginate(query, this.repo, {
      where: { userId },
      sortableColumns: ['type', 'name', 'createdAt'],
      defaultSortBy: [
        ['type', 'ASC'],
        ['name', 'ASC'],
      ],
      searchableColumns: ['name', 'legalName'],
      filterableColumns: { type: [FilterOperator.EQ], archived: [FilterOperator.EQ] },
      defaultLimit: 100,
      maxLimit: 100,
    });
  }

  /**
   * Busca um livro do usuário.
   *
   * @param userId - Dono
   * @param ledgerId - Id do livro
   * @returns Livro encontrado
   * @throws `NotFoundException` se não existir ou for de outro usuário
   *
   * @example
   * const ledger = await ledgersService.findOne(userId, ledgerId);
   */
  findOne(userId: string, ledgerId: string): Promise<Ledger> {
    return findOwnedOrFail(this.repo, { userId, ledgerId }, 'Livro não encontrado.');
  }

  /**
   * Busca o livro pessoal do usuário.
   *
   * @param userId - Dono
   * @returns Livro pessoal
   * @throws `NotFoundException` se o cadastro não o criou
   *
   * @example
   * const personal = await ledgersService.findPersonal(userId);
   */
  findPersonal(userId: string): Promise<Ledger> {
    return findOwnedOrFail(this.repo, { userId, type: LedgerType.PERSONAL }, 'Livro pessoal não encontrado.');
  }

  /**
   * Cria o livro pessoal durante o cadastro.
   *
   * @param manager - Gerenciador da transação do cadastro
   * @param userId - Novo usuário
   * @returns Livro pessoal criado
   *
   * @example
   * await ledgersService.createPersonal(manager, user.userId);
   */
  createPersonal(manager: EntityManager, userId: string): Promise<Ledger> {
    const repo = manager.getRepository(Ledger);
    return repo.save(repo.create({ userId, type: LedgerType.PERSONAL, name: 'Pessoal', color: 'blue' }));
  }

  /**
   * Cadastra uma empresa do usuário.
   *
   * @param userId - Dono
   * @param dto - Dados da empresa
   * @returns Livro `COMPANY` criado
   *
   * @example
   * await ledgersService.create(userId, { name: 'Studio Ltda', document: '11222333000181' });
   */
  async create(userId: string, dto: CreateLedgerDto): Promise<Ledger> {
    const ledger = await this.repo.save(this.repo.create({ ...dto, name: dto.name.trim(), userId, type: LedgerType.COMPANY }));
    this.logger.log(`Empresa criada: ${ledger.ledgerId}`);
    return ledger;
  }

  /**
   * Edita um livro.
   *
   * @param userId - Dono
   * @param ledgerId - Id do livro
   * @param dto - Campos alterados
   * @returns Livro atualizado
   * @throws `BadRequestException` ao tentar arquivar o livro pessoal
   *
   * @example
   * await ledgersService.update(userId, ledgerId, { archived: true });
   */
  async update(userId: string, ledgerId: string, dto: UpdateLedgerDto): Promise<Ledger> {
    const ledger = await this.findOne(userId, ledgerId);
    if (ledger.type === LedgerType.PERSONAL && dto.archived) throw new BadRequestException('O livro pessoal não pode ser arquivado.');
    Object.assign(ledger, dto);
    return this.repo.save(ledger);
  }

  /**
   * Apaga uma empresa sem movimentação. Com contas ou lançamentos, o banco
   * recusa (`RESTRICT`) e o filtro global responde 409 — o caminho é arquivar.
   *
   * @param userId - Dono
   * @param ledgerId - Id do livro
   * @throws `BadRequestException` ao tentar apagar o livro pessoal
   *
   * @example
   * await ledgersService.remove(userId, ledgerId);
   */
  async remove(userId: string, ledgerId: string): Promise<void> {
    const ledger = await this.findOne(userId, ledgerId);
    if (ledger.type === LedgerType.PERSONAL) throw new BadRequestException('O livro pessoal não pode ser apagado.');
    await this.repo.remove(ledger);
  }
}
