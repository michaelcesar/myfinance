/**
 * Serviço de lançamentos manuais (receitas e despesas).
 *
 * @module modules/transactions/transactions.service
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { type EntityManager, Repository } from 'typeorm';
import { findOwnedOrFail } from '~/common/utils';
import { RecurrenceSkip } from '~/modules/recurrences/entities/recurrence-skip.entity';
import { type CreateTransactionDto } from './dto/create-transaction.dto';
import { type UpdateTransactionDto } from './dto/update-transaction.dto';
import { Transaction } from './entities/transaction.entity';
import { TransactionKind } from './enums/transaction-kind.enum';
import { TransactionStatus } from './enums/transaction-status.enum';
import { TransactionLinksService } from './transaction-links.service';

/**
 * CRUD de receitas e despesas. Lançamentos gerados por transferência ou
 * movimentação de investimento aparecem na listagem, mas só mudam pela
 * origem deles.
 *
 * @example
 * await transactionsService.create(userId, { accountId, kind: TransactionKind.EXPENSE, amountCents: 4590, date: '2026-11-14', description: 'Farmácia' });
 */
@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private readonly repo: Repository<Transaction>,
    private readonly links: TransactionLinksService
  ) {}

  /**
   * Lista os lançamentos, mais recentes primeiro.
   *
   * @param userId - Dono
   * @param query - Paginação, busca na descrição e filtros (livro, conta,
   *   tipo, situação, categoria, contratante, fonte, intervalo de datas)
   * @returns Página de lançamentos com relações
   *
   * @example
   * GET /transactions?filter.ledgerId=$eq:6f1c...&filter.date=$btw:2026-11-01,2026-11-30
   */
  findAll(userId: string, query: PaginateQuery): Promise<Paginated<Transaction>> {
    return paginate(query, this.repo, {
      where: { userId },
      relations: { account: true, category: true, ledger: true, transfer: true, recurrence: true },
      sortableColumns: ['date', 'amountCents', 'createdAt', 'description'],
      defaultSortBy: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      searchableColumns: ['description', 'notes'],
      filterableColumns: {
        ledgerId: [FilterOperator.EQ, FilterOperator.IN],
        accountId: [FilterOperator.EQ, FilterOperator.IN],
        kind: [FilterOperator.EQ, FilterOperator.IN],
        status: [FilterOperator.EQ],
        categoryId: [FilterOperator.EQ, FilterOperator.NULL],
        transferId: [FilterOperator.NULL],
        recurrenceId: [FilterOperator.EQ, FilterOperator.NULL],
        date: [FilterOperator.GTE, FilterOperator.LTE, FilterOperator.BTW],
      },
      defaultLimit: 50,
      maxLimit: 200,
    });
  }

  /**
   * Busca um lançamento.
   *
   * @param userId - Dono
   * @param transactionId - Id do lançamento
   * @returns Lançamento com relações
   * @throws `NotFoundException` se não existir ou for de outro usuário
   *
   * @example
   * await transactionsService.findOne(userId, transactionId);
   */
  findOne(userId: string, transactionId: string): Promise<Transaction> {
    return findOwnedOrFail(this.repo, { userId, transactionId }, 'Lançamento não encontrado.', {
      account: true,
      category: true,
      ledger: true,
      transfer: true,
      recurrence: true,
    });
  }

  /**
   * Cria uma receita ou despesa.
   *
   * @param userId - Dono
   * @param dto - Dados do lançamento
   * @returns Lançamento criado, com relações
   *
   * @example
   * await transactionsService.create(userId, dto);
   */
  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const links = await this.links.resolve(userId, dto.kind, dto);
    const transaction = await this.repo.save(this.repo.create({ ...dto, description: dto.description.trim(), userId, ledgerId: links.ledgerId }));
    return this.findOne(userId, transaction.transactionId);
  }

  /**
   * Edita uma receita ou despesa.
   *
   * @param userId - Dono
   * @param transactionId - Id do lançamento
   * @param dto - Campos alterados
   * @returns Lançamento atualizado
   * @throws `BadRequestException` para lançamento gerado pelo sistema
   *
   * @example
   * await transactionsService.update(userId, transactionId, { status: TransactionStatus.PAID });
   */
  async update(userId: string, transactionId: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const current = await this.findOne(userId, transactionId);
    this.assertManual(current);
    const kind = dto.kind ?? (current.kind as TransactionKind.INCOME | TransactionKind.EXPENSE);
    const merged = {
      accountId: dto.accountId ?? current.accountId,
      categoryId: dto.categoryId !== undefined ? dto.categoryId : current.categoryId,
    };
    const links = await this.links.resolve(userId, kind, merged);
    const next = { ...dto, ...merged, kind, ledgerId: links.ledgerId };
    const unlink = this.becomesException(current, next);
    await this.repo.manager.transaction(async manager => {
      if (unlink) await this.skipMonth(manager, current);
      await manager.update(Transaction, { transactionId, userId }, unlink ? { ...next, recurrenceId: null, recurrenceMonth: null } : next);
    });
    return this.findOne(userId, transactionId);
  }

  /**
   * Apaga uma receita ou despesa.
   *
   * @param userId - Dono
   * @param transactionId - Id do lançamento
   * @throws `BadRequestException` para lançamento gerado pelo sistema
   *
   * @example
   * await transactionsService.remove(userId, transactionId);
   */
  async remove(userId: string, transactionId: string): Promise<void> {
    const transaction = await this.findOne(userId, transactionId);
    this.assertManual(transaction);
    await this.repo.manager.transaction(async manager => {
      await this.skipMonth(manager, transaction);
      await manager.delete(Transaction, { transactionId, userId });
    });
  }

  /**
   * Diz se a edição transforma um mês gerado por recorrente em exceção:
   * continua pendente e algum campo realmente mudou. Confirmar
   * (`PENDING → PAID`) nunca desvincula, mesmo com outra data ou valor, e
   * pago não é mais tocado pelo recorrente (`ADR-011`). Compara valores
   * porque a folha da web sempre manda todos os campos.
   *
   * @param current - Lançamento como está
   * @param next - Valores finais da edição
   * @returns `true` quando o mês deve sair do recorrente
   */
  private becomesException(current: Transaction, next: UpdateTransactionDto & { kind: TransactionKind }): boolean {
    if (!current.recurrenceId) return false;
    if (current.status !== TransactionStatus.PENDING || (next.status ?? current.status) !== TransactionStatus.PENDING) return false;
    const before = [current.accountId, current.kind, current.amountCents, current.date, current.description, current.categoryId, current.notes ?? null];
    const after = [
      next.accountId,
      next.kind,
      next.amountCents ?? current.amountCents,
      next.date ?? current.date,
      next.description !== undefined ? next.description.trim() : current.description,
      next.categoryId ?? null,
      next.notes !== undefined ? next.notes || null : (current.notes ?? null),
    ];
    return before.some((value, index) => value !== after[index]);
  }

  /**
   * Registra que o dono tirou este mês do recorrente, para o gerador não recriá-lo.
   *
   * @param manager - Transação em curso
   * @param transaction - Lançamento que sai do recorrente
   */
  private async skipMonth(manager: EntityManager, transaction: Transaction): Promise<void> {
    if (!transaction.recurrenceId || !transaction.recurrenceMonth) return;
    await manager
      .createQueryBuilder()
      .insert()
      .into(RecurrenceSkip)
      .values({ userId: transaction.userId, recurrenceId: transaction.recurrenceId, month: transaction.recurrenceMonth })
      .orIgnore()
      .execute();
  }

  /**
   * Recusa alteração direta em lançamento gerado pelo sistema.
   *
   * @param transaction - Lançamento carregado
   */
  private assertManual(transaction: Transaction): void {
    if (transaction.transferId) throw new BadRequestException('Este lançamento é parte de uma transferência. Edite a transferência.');
    if (transaction.investmentMovementId) throw new BadRequestException('Este lançamento é parte de uma movimentação de investimento. Edite a movimentação.');
  }
}
