/**
 * Serviço de contas e saldos.
 *
 * @module modules/accounts/accounts.service
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { In, Repository } from 'typeorm';
import { findOwnedOrFail, monthlyYieldCents } from '~/common/utils';
import { LedgersService } from '~/modules/ledgers/ledgers.service';
import { Transaction } from '~/modules/transactions/entities/transaction.entity';
import { TransactionStatus } from '~/modules/transactions/enums/transaction-status.enum';
import { type CreateAccountDto } from './dto/create-account.dto';
import { type UpdateAccountDto } from './dto/update-account.dto';
import { Account } from './entities/account.entity';

/** Conta com o saldo calculado. */
export type AccountWithBalance = Omit<Account, 'generateId'> & { balanceCents: number; estimatedMonthlyYieldCents: number };

/**
 * Junta à conta o saldo derivado e o rendimento estimado do mês.
 *
 * @param account - Conta carregada
 * @param movedCents - Soma dos lançamentos pagos
 * @returns Conta com saldo e estimativa
 */
function withBalance(account: Account, movedCents: number): AccountWithBalance {
  const balanceCents = account.initialBalanceCents + movedCents;
  return { ...account, balanceCents, estimatedMonthlyYieldCents: monthlyYieldCents(balanceCents, account.annualYieldRate) };
}

/**
 * Expressão SQL do valor com sinal de um lançamento: entrada soma, saída
 * subtrai. Compartilhada com o `DashboardService`.
 */
export const SIGNED_AMOUNT_SQL = `CASE WHEN t.kind IN ('INCOME', 'TRANSFER_IN') THEN t.amount_cents ELSE -t.amount_cents END`;

/**
 * CRUD de contas. O saldo é derivado: saldo inicial + lançamentos pagos
 * (`ADR-006`). Nada grava saldo, então não há saldo para dessincronizar.
 *
 * @example
 * const accounts = await accountsService.findAll(userId, query);
 */
@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account) private readonly repo: Repository<Account>,
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
    private readonly ledgersService: LedgersService
  ) {}

  /**
   * Lista as contas com saldo.
   *
   * @param userId - Dono
   * @param query - Paginação, filtros (`ledgerId`, `type`, `archived`) e busca
   * @returns Página de contas com `balanceCents`
   *
   * @example
   * GET /accounts?filter.ledgerId=$eq:6f1c...
   */
  async findAll(userId: string, query: PaginateQuery): Promise<Paginated<AccountWithBalance>> {
    const page = await paginate(query, this.repo, {
      where: { userId },
      relations: { ledger: true },
      sortableColumns: ['name', 'type', 'createdAt'],
      defaultSortBy: [['name', 'ASC']],
      searchableColumns: ['name', 'institution'],
      filterableColumns: { ledgerId: [FilterOperator.EQ, FilterOperator.IN], type: [FilterOperator.EQ], archived: [FilterOperator.EQ] },
      defaultLimit: 100,
      maxLimit: 100,
    });
    const balances = await this.balancesFor(
      userId,
      page.data.map(account => account.accountId)
    );
    return { ...page, data: page.data.map(account => withBalance(account, balances.get(account.accountId) ?? 0)) } as Paginated<AccountWithBalance>;
  }

  /**
   * Busca uma conta do usuário, com saldo.
   *
   * @param userId - Dono
   * @param accountId - Id da conta
   * @returns Conta com `balanceCents`
   * @throws `NotFoundException` se não existir ou for de outro usuário
   *
   * @example
   * const account = await accountsService.findOne(userId, accountId);
   */
  async findOne(userId: string, accountId: string): Promise<AccountWithBalance> {
    const account = await findOwnedOrFail(this.repo, { userId, accountId }, 'Conta não encontrada.', { ledger: true });
    const balances = await this.balancesFor(userId, [accountId]);
    return withBalance(account, balances.get(accountId) ?? 0);
  }

  /**
   * Garante que a conta é do usuário e, opcionalmente, de um livro.
   *
   * @param userId - Dono
   * @param accountId - Id da conta
   * @param ledgerId - Livro esperado, quando a regra exige
   * @returns Conta encontrada
   * @throws `BadRequestException` se a conta for de outro livro
   *
   * @example
   * await accountsService.assertOwned(userId, dto.accountId, ledgerId);
   */
  async assertOwned(userId: string, accountId: string, ledgerId?: string): Promise<Account> {
    const account = await findOwnedOrFail(this.repo, { userId, accountId }, 'Conta não encontrada.');
    if (ledgerId && account.ledgerId !== ledgerId) throw new BadRequestException('A conta escolhida é de outro livro.');
    return account;
  }

  /**
   * Cria uma conta num livro do usuário.
   *
   * @param userId - Dono
   * @param dto - Dados da conta
   * @returns Conta criada, com saldo
   *
   * @example
   * await accountsService.create(userId, { ledgerId, name: 'Itaú PJ', type: AccountType.CHECKING });
   */
  async create(userId: string, dto: CreateAccountDto): Promise<AccountWithBalance> {
    await this.ledgersService.findOne(userId, dto.ledgerId);
    const account = await this.repo.save(this.repo.create({ ...dto, name: dto.name.trim(), userId }));
    return this.findOne(userId, account.accountId);
  }

  /**
   * Edita uma conta.
   *
   * @param userId - Dono
   * @param accountId - Id da conta
   * @param dto - Campos alterados
   * @returns Conta atualizada, com saldo
   *
   * @example
   * await accountsService.update(userId, accountId, { archived: true });
   */
  async update(userId: string, accountId: string, dto: UpdateAccountDto): Promise<AccountWithBalance> {
    const account = await this.assertOwned(userId, accountId);
    Object.assign(account, dto);
    await this.repo.save(account);
    return this.findOne(userId, accountId);
  }

  /**
   * Apaga uma conta sem lançamentos. Com lançamentos, o banco recusa
   * (`RESTRICT`) e a resposta é 409 — o caminho é arquivar.
   *
   * @param userId - Dono
   * @param accountId - Id da conta
   *
   * @example
   * await accountsService.remove(userId, accountId);
   */
  async remove(userId: string, accountId: string): Promise<void> {
    const account = await this.assertOwned(userId, accountId);
    await this.repo.remove(account);
  }

  /**
   * Soma os lançamentos pagos por conta.
   *
   * @param userId - Dono
   * @param accountIds - Contas a somar
   * @returns Mapa conta → soma com sinal, em centavos
   */
  private async balancesFor(userId: string, accountIds: string[]): Promise<Map<string, number>> {
    if (!accountIds.length) return new Map();
    const rows = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.account_id', 'accountId')
      .addSelect(`COALESCE(SUM(${SIGNED_AMOUNT_SQL}), 0)`, 'total')
      .where('t.user_id = :userId', { userId })
      .andWhere({ accountId: In(accountIds) })
      .andWhere('t.status = :status', { status: TransactionStatus.PAID })
      .groupBy('t.account_id')
      .getRawMany<{ accountId: string; total: string }>();
    return new Map(rows.map(row => [row.accountId, Number(row.total)]));
  }
}
