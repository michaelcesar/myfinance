/**
 * Serviço de recorrentes: cadastro e geração dos meses pendentes.
 *
 * @module modules/recurrences/recurrences.service
 */
import { BadRequestException, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { DataSource, type EntityManager, MoreThanOrEqual, Repository } from 'typeorm';
import { findOwnedOrFail } from '~/common/utils';
import { Transaction } from '~/modules/transactions/entities/transaction.entity';
import { TransactionStatus } from '~/modules/transactions/enums/transaction-status.enum';
import { TransactionLinksService } from '~/modules/transactions/transaction-links.service';
import { type CreateRecurrenceDto } from './dto/create-recurrence.dto';
import { type UpdateRecurrenceDto } from './dto/update-recurrence.dto';
import { Recurrence } from './entities/recurrence.entity';
import { currentMonth, dueDate, generationWindow, todayIso, toMonth } from './recurrence-months';

/** Recorrente com o próximo vencimento e a quantidade de pendentes vinculados. */
export type RecurrenceView = Recurrence & { nextDate: string | null; pendingCount: number };

/** Filtro do gerador: tudo, um usuário ou um recorrente. */
export interface MaterializeFilter {
  userId?: string;
  recurrenceId?: string;
}

const RELATIONS = { account: true, category: true, ledger: true } as const;

/**
 * Cadastra recorrentes e mantém os meses da janela (mês atual + 2) criados
 * como lançamentos pendentes. Lançamento pago nunca é tocado; mês que o dono
 * tirou (`recurrence_skip`) nunca volta; o índice único impede duplicata.
 *
 * @example
 * await recurrencesService.create(userId, { accountId, kind: TransactionKind.INCOME, description: 'Contrato Acme', amountCents: 900000, dayOfMonth: 10, startMonth: '2026-11-01' });
 */
@Injectable()
export class RecurrencesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RecurrencesService.name);

  constructor(
    @InjectRepository(Recurrence) private readonly repo: Repository<Recurrence>,
    private readonly links: TransactionLinksService,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Gera os meses que faltam ao ligar a API — cobre o computador desligado
   * na virada do mês. Erro aqui só é registrado; não impede a API de subir.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const created = await this.materialize();
      if (created) this.logger.log(`Lançamentos recorrentes criados no boot: ${created}`);
    } catch (error) {
      this.logger.error('Falha ao gerar lançamentos recorrentes no boot.', error instanceof Error ? error.stack : String(error));
    }
  }

  /**
   * Lista os recorrentes, por descrição.
   *
   * @param userId - Dono
   * @param query - Paginação, busca e filtros (livro, conta, tipo, contratante)
   * @returns Página de recorrentes com próximo vencimento e pendentes
   *
   * @example
   * GET /recurrences?filter.ledgerId=$eq:6f1c...&filter.kind=$eq:INCOME
   */
  async findAll(userId: string, query: PaginateQuery): Promise<Paginated<RecurrenceView>> {
    const page = await paginate(query, this.repo, {
      where: { userId },
      relations: RELATIONS,
      sortableColumns: ['description', 'amountCents', 'dayOfMonth', 'createdAt'],
      defaultSortBy: [['description', 'ASC']],
      searchableColumns: ['description', 'notes'],
      filterableColumns: {
        ledgerId: [FilterOperator.EQ, FilterOperator.IN],
        accountId: [FilterOperator.EQ],
        kind: [FilterOperator.EQ],
      },
      defaultLimit: 50,
      maxLimit: 200,
    });
    return { ...page, data: await this.withStats(userId, page.data) } as Paginated<RecurrenceView>;
  }

  /**
   * Busca um recorrente.
   *
   * @param userId - Dono
   * @param recurrenceId - Id do recorrente
   * @returns Recorrente com relações, próximo vencimento e pendentes
   * @throws `NotFoundException` se não existir ou for de outro usuário
   *
   * @example
   * await recurrencesService.findOne(userId, recurrenceId);
   */
  async findOne(userId: string, recurrenceId: string): Promise<RecurrenceView> {
    const recurrence = await findOwnedOrFail(this.repo, { userId, recurrenceId }, 'Recorrente não encontrado.', RELATIONS);
    const [view] = await this.withStats(userId, [recurrence]);
    return view;
  }

  /**
   * Cria um recorrente e já gera os meses da janela.
   *
   * @param userId - Dono
   * @param dto - Dados do recorrente
   * @returns Recorrente criado
   * @throws `BadRequestException` com vínculo inválido ou fim antes do início
   *
   * @example
   * await recurrencesService.create(userId, dto);
   */
  async create(userId: string, dto: CreateRecurrenceDto): Promise<RecurrenceView> {
    const startMonth = toMonth(dto.startMonth);
    const endMonth = dto.endMonth ? toMonth(dto.endMonth) : null;
    this.assertMonths(startMonth, endMonth);
    this.assertDays(dto.dayOfMonthStart ?? null, dto.dayOfMonth);
    const links = await this.links.resolve(userId, dto.kind, dto);
    const recurrence = await this.repo.save(
      this.repo.create({
        ...dto,
        description: dto.description.trim(),
        startMonth,
        endMonth,
        userId,
        ledgerId: links.ledgerId,
        categoryId: dto.categoryId ?? null,
        dayOfMonthStart: dto.dayOfMonthStart ?? null,
        notes: dto.notes ?? null,
      })
    );
    await this.materialize({ recurrenceId: recurrence.recurrenceId });
    return this.findOne(userId, recurrence.recurrenceId);
  }

  /**
   * Edita um recorrente. Os pendentes vinculados do mês atual em diante
   * recebem os valores novos; os que saíram da vigência são apagados (e voltam se a
   * vigência voltar); pagos não mudam.
   *
   * @param userId - Dono
   * @param recurrenceId - Id do recorrente
   * @param dto - Campos alterados
   * @returns Recorrente atualizado
   * @throws `BadRequestException` com vínculo inválido ou fim antes do início
   *
   * @example
   * await recurrencesService.update(userId, recurrenceId, { amountCents: 950000 });
   */
  async update(userId: string, recurrenceId: string, dto: UpdateRecurrenceDto): Promise<RecurrenceView> {
    const current = await findOwnedOrFail(this.repo, { userId, recurrenceId }, 'Recorrente não encontrado.');
    const startMonth = dto.startMonth ? toMonth(dto.startMonth) : current.startMonth;
    const endMonth = dto.endMonth !== undefined ? (dto.endMonth ? toMonth(dto.endMonth) : null) : current.endMonth;
    this.assertMonths(startMonth, endMonth);
    const dayOfMonth = dto.dayOfMonth ?? current.dayOfMonth;
    const dayOfMonthStart = dto.dayOfMonthStart !== undefined ? dto.dayOfMonthStart : current.dayOfMonthStart;
    this.assertDays(dayOfMonthStart, dayOfMonth);
    const merged = {
      accountId: dto.accountId ?? current.accountId,
      categoryId: dto.categoryId !== undefined ? dto.categoryId : current.categoryId,
    };
    const links = await this.links.resolve(userId, current.kind, merged);
    const next: Recurrence = Object.assign(current, {
      ...merged,
      ledgerId: links.ledgerId,
      description: dto.description !== undefined ? dto.description.trim() : current.description,
      amountCents: dto.amountCents ?? current.amountCents,
      dayOfMonth,
      dayOfMonthStart,
      notes: dto.notes !== undefined ? dto.notes : current.notes,
      startMonth,
      endMonth,
    });
    await this.dataSource.transaction(async manager => {
      await manager.save(Recurrence, next);
      await this.syncPending(manager, next);
    });
    await this.materialize({ recurrenceId });
    return this.findOne(userId, recurrenceId);
  }

  /**
   * Apaga um recorrente com os pendentes vinculados do mês atual em diante
   * (inclusive o deste mês com o dia já passado — senão, apagar e recriar
   * duplicaria o mês). Os demais lançamentos ficam como lançamentos comuns.
   *
   * @param userId - Dono
   * @param recurrenceId - Id do recorrente
   *
   * @example
   * await recurrencesService.remove(userId, recurrenceId);
   */
  async remove(userId: string, recurrenceId: string): Promise<void> {
    await findOwnedOrFail(this.repo, { userId, recurrenceId }, 'Recorrente não encontrado.');
    await this.dataSource.transaction(async manager => {
      await manager.delete(Transaction, { recurrenceId, status: TransactionStatus.PENDING, recurrenceMonth: MoreThanOrEqual(currentMonth()) });
      await manager.delete(Recurrence, { recurrenceId, userId });
    });
  }

  /**
   * Cria os lançamentos pendentes que faltam na janela de cada recorrente.
   * Idempotente: pode rodar em paralelo e quantas vezes for preciso.
   *
   * @param filter - Restringe a um usuário ou a um recorrente
   * @returns Quantos lançamentos foram criados
   *
   * @example
   * await recurrencesService.materialize({ userId });
   */
  async materialize(filter: MaterializeFilter = {}): Promise<number> {
    const where = { ...(filter.userId && { userId: filter.userId }), ...(filter.recurrenceId && { recurrenceId: filter.recurrenceId }) };
    const recurrences = await this.repo.find({ select: { recurrenceId: true }, where });
    let created = 0;
    for (const { recurrenceId } of recurrences) created += await this.dataSource.transaction(manager => this.materializeOne(manager, recurrenceId));
    return created;
  }

  /**
   * Gera os meses de um recorrente, com a linha dele travada até o fim da transação.
   *
   * @param manager - Transação em curso
   * @param recurrenceId - Id do recorrente
   * @returns Quantos lançamentos foram criados
   */
  private async materializeOne(manager: EntityManager, recurrenceId: string): Promise<number> {
    const recurrence = await manager.findOne(Recurrence, { where: { recurrenceId }, lock: { mode: 'pessimistic_write' } });
    if (!recurrence || (await this.isArchived(manager, recurrence.accountId))) return 0;
    const window = generationWindow(recurrence.startMonth, recurrence.endMonth);
    if (!window.length) return 0;

    const taken = await manager.query<{ month: string }[]>(
      `SELECT to_char(recurrence_month, 'YYYY-MM-DD') AS month FROM "transaction" WHERE recurrence_id = $1
       UNION SELECT to_char(month, 'YYYY-MM-DD') FROM recurrence_skip WHERE recurrence_id = $1`,
      [recurrenceId]
    );
    const takenMonths = new Set(taken.map(row => row.month));
    const missing = window.filter(month => !takenMonths.has(month));
    if (!missing.length) return 0;

    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(Transaction)
      .values(
        missing.map(month => ({
          userId: recurrence.userId,
          ledgerId: recurrence.ledgerId,
          accountId: recurrence.accountId,
          kind: recurrence.kind,
          status: TransactionStatus.PENDING,
          amountCents: recurrence.amountCents,
          date: dueDate(month, recurrence.dayOfMonth),
          description: recurrence.description,
          categoryId: recurrence.categoryId,
          recurrenceId,
          recurrenceMonth: month,
          notes: null,
        }))
      )
      .orIgnore()
      .execute();
    return result.identifiers.filter(Boolean).length;
  }

  /**
   * Leva a edição do recorrente aos pendentes vinculados: apaga os que saíram
   * da vigência e atualiza os do mês atual em diante. Um pendente vinculado
   * nunca foi editado pelo dono (editar desvincula), então reescrevê-lo é
   * seguro. Pagos ficam como estão.
   *
   * @param manager - Transação em curso
   * @param recurrence - Recorrente já com os valores novos
   */
  private async syncPending(manager: EntityManager, recurrence: Recurrence): Promise<void> {
    await manager.query(
      `DELETE FROM "transaction"
       WHERE recurrence_id = $1 AND status = 'PENDING' AND (recurrence_month < $2 OR ($3::date IS NOT NULL AND recurrence_month > $3::date))`,
      [recurrence.recurrenceId, recurrence.startMonth, recurrence.endMonth]
    );
    const pending = await manager.find(Transaction, {
      select: { transactionId: true, recurrenceMonth: true },
      where: { recurrenceId: recurrence.recurrenceId, status: TransactionStatus.PENDING, recurrenceMonth: MoreThanOrEqual(currentMonth()) },
    });
    for (const transaction of pending) {
      await manager.update(Transaction, transaction.transactionId, {
        accountId: recurrence.accountId,
        ledgerId: recurrence.ledgerId,
        amountCents: recurrence.amountCents,
        description: recurrence.description,
        categoryId: recurrence.categoryId,
        date: dueDate(transaction.recurrenceMonth as string, recurrence.dayOfMonth),
      });
    }
  }

  /**
   * Anexa próximo vencimento e pendentes vinculados a cada recorrente.
   *
   * @param userId - Dono
   * @param recurrences - Recorrentes carregados
   * @returns Os mesmos recorrentes com os campos calculados
   */
  private async withStats(userId: string, recurrences: Recurrence[]): Promise<RecurrenceView[]> {
    if (!recurrences.length) return [];
    const rows = await this.dataSource.query<{ recurrence_id: string; pending: string; next_date: string | null }[]>(
      `SELECT recurrence_id, COUNT(*) AS pending, to_char(MIN(date) FILTER (WHERE date >= $2::date), 'YYYY-MM-DD') AS next_date
       FROM "transaction"
       WHERE user_id = $1 AND status = 'PENDING' AND recurrence_id = ANY($3::uuid[])
       GROUP BY recurrence_id`,
      [userId, todayIso(), recurrences.map(recurrence => recurrence.recurrenceId)]
    );
    const stats = new Map(rows.map(row => [row.recurrence_id, row]));
    return recurrences.map(recurrence => {
      const stat = stats.get(recurrence.recurrenceId);
      return Object.assign(recurrence, { nextDate: stat?.next_date ?? null, pendingCount: stat ? Number(stat.pending) : 0 });
    });
  }

  /**
   * Diz se a conta do recorrente, ou o livro dela, está arquivada — aí o
   * contrato para de gerar meses, como quem aposentou a empresa espera.
   *
   * @param manager - Transação em curso
   * @param accountId - Conta do recorrente
   * @returns `true` quando a conta ou o livro está arquivado
   */
  private async isArchived(manager: EntityManager, accountId: string): Promise<boolean> {
    const [row] = await manager.query<{ archived: boolean }[]>('SELECT (a.archived OR l.archived) AS archived FROM account a JOIN ledger l ON l.ledger_id = a.ledger_id WHERE a.account_id = $1', [
      accountId,
    ]);
    return Boolean(row?.archived);
  }

  /**
   * Recusa janela de recebimento invertida.
   *
   * @param dayOfMonthStart - Primeiro dia da janela, ou `null`
   * @param dayOfMonth - Último dia (prazo)
   * @throws `BadRequestException` quando o primeiro dia vem depois do último
   */
  private assertDays(dayOfMonthStart: number | null, dayOfMonth: number): void {
    if (dayOfMonthStart !== null && dayOfMonthStart > dayOfMonth) throw new BadRequestException('O primeiro dia não pode ser depois do último.');
  }

  /**
   * Recusa fim antes do início.
   *
   * @param startMonth - Início normalizado
   * @param endMonth - Fim normalizado
   * @throws `BadRequestException` quando o fim vem antes
   */
  private assertMonths(startMonth: string, endMonth: string | null): void {
    if (endMonth !== null && endMonth < startMonth) throw new BadRequestException('O fim não pode ser antes do início.');
  }
}
