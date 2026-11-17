/**
 * Serviço de investimentos e movimentações.
 *
 * @module modules/investments/investments.service
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterOperator, paginate, type Paginated, type PaginateQuery } from 'nestjs-paginate';
import { DataSource, In, Repository } from 'typeorm';
import { findOwnedOrFail } from '~/common/utils';
import { AccountsService } from '~/modules/accounts/accounts.service';
import { LedgersService } from '~/modules/ledgers/ledgers.service';
import { Transaction } from '~/modules/transactions/entities/transaction.entity';
import { TransactionKind } from '~/modules/transactions/enums/transaction-kind.enum';
import { TransactionStatus } from '~/modules/transactions/enums/transaction-status.enum';
import { type CreateInvestmentDto } from './dto/create-investment.dto';
import { type CreateMovementDto } from './dto/create-movement.dto';
import { type UpdateInvestmentDto } from './dto/update-investment.dto';
import { InvestmentMovement } from './entities/investment-movement.entity';
import { Investment } from './entities/investment.entity';
import { MovementKind } from './enums/movement-kind.enum';

/** Números derivados das movimentações. */
export interface InvestmentStats {
  /** Aportes menos resgates. */
  investedCents: number;
  /** Soma dos rendimentos lançados. */
  yieldCents: number;
  /** Valor atual menos o investido. */
  returnCents: number;
}

/** Investimento com os números derivados. */
export type InvestmentWithStats = Omit<Investment, 'generateId'> & InvestmentStats;

/** Rótulo do lançamento gerado na conta por tipo de movimentação. */
const MOVEMENT_LABELS: Record<MovementKind, string> = {
  [MovementKind.CONTRIBUTION]: 'Aporte',
  [MovementKind.WITHDRAWAL]: 'Resgate',
  [MovementKind.YIELD]: 'Rendimento',
};

/**
 * Efeito de cada tipo no valor atual: aporte e rendimento somam, resgate
 * subtrai. Apagar a movimentação aplica o inverso (`ADR-007`).
 */
const VALUE_SIGN: Record<MovementKind, 1 | -1> = {
  [MovementKind.CONTRIBUTION]: 1,
  [MovementKind.WITHDRAWAL]: -1,
  [MovementKind.YIELD]: 1,
};

/**
 * Carteira de investimentos por livro. Aporte e resgate com conta geram
 * uma perna de transferência na conta, então o saldo bancário acompanha
 * sem o dinheiro virar despesa ou receita.
 *
 * @example
 * await investmentsService.addMovement(userId, investmentId, { kind: MovementKind.CONTRIBUTION, amountCents: 100000, date: '2026-11-10', accountId });
 */
@Injectable()
export class InvestmentsService {
  private readonly logger = new Logger(InvestmentsService.name);

  constructor(
    @InjectRepository(Investment) private readonly repo: Repository<Investment>,
    @InjectRepository(InvestmentMovement) private readonly movementRepo: Repository<InvestmentMovement>,
    private readonly ledgersService: LedgersService,
    private readonly accountsService: AccountsService,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Lista os investimentos com investido, rendimento e retorno.
   *
   * @param userId - Dono
   * @param query - Paginação, filtros (`ledgerId`, `type`, `archived`) e busca
   * @returns Página de investimentos
   *
   * @example
   * GET /investments?filter.ledgerId=$eq:6f1c...
   */
  async findAll(userId: string, query: PaginateQuery): Promise<Paginated<InvestmentWithStats>> {
    const page = await paginate(query, this.repo, {
      where: { userId },
      relations: { ledger: true },
      sortableColumns: ['name', 'type', 'currentValueCents', 'createdAt'],
      defaultSortBy: [['currentValueCents', 'DESC']],
      searchableColumns: ['name', 'institution'],
      filterableColumns: { ledgerId: [FilterOperator.EQ], type: [FilterOperator.EQ], archived: [FilterOperator.EQ] },
      defaultLimit: 100,
      maxLimit: 100,
    });
    const stats = await this.statsFor(page.data);
    return { ...page, data: page.data.map(investment => ({ ...investment, ...stats.get(investment.investmentId)! })) } as Paginated<InvestmentWithStats>;
  }

  /**
   * Busca um investimento com os números derivados.
   *
   * @param userId - Dono
   * @param investmentId - Id do investimento
   * @returns Investimento
   * @throws `NotFoundException` se não existir ou for de outro usuário
   *
   * @example
   * await investmentsService.findOne(userId, investmentId);
   */
  async findOne(userId: string, investmentId: string): Promise<InvestmentWithStats> {
    const investment = await findOwnedOrFail(this.repo, { userId, investmentId }, 'Investimento não encontrado.', { ledger: true });
    const stats = await this.statsFor([investment]);
    return { ...investment, ...stats.get(investmentId)! };
  }

  /**
   * Cadastra um investimento.
   *
   * @param userId - Dono
   * @param dto - Dados do ativo
   * @returns Investimento criado
   *
   * @example
   * await investmentsService.create(userId, { ledgerId, name: 'Tesouro Selic 2029', type: InvestmentType.FIXED_INCOME });
   */
  async create(userId: string, dto: CreateInvestmentDto): Promise<InvestmentWithStats> {
    await this.ledgersService.findOne(userId, dto.ledgerId);
    const investment = await this.repo.save(this.repo.create({ ...dto, name: dto.name.trim(), userId }));
    return this.findOne(userId, investment.investmentId);
  }

  /**
   * Edita um investimento ou atualiza o valor de mercado.
   *
   * @param userId - Dono
   * @param investmentId - Id do investimento
   * @param dto - Campos alterados
   * @returns Investimento atualizado
   *
   * @example
   * await investmentsService.update(userId, investmentId, { currentValueCents: 1534000, valuedAt: '2026-11-16' });
   */
  async update(userId: string, investmentId: string, dto: UpdateInvestmentDto): Promise<InvestmentWithStats> {
    await this.findOne(userId, investmentId);
    await this.repo.update({ investmentId, userId }, dto);
    return this.findOne(userId, investmentId);
  }

  /**
   * Apaga o investimento, as movimentações e os lançamentos gerados por elas.
   *
   * @param userId - Dono
   * @param investmentId - Id do investimento
   *
   * @example
   * await investmentsService.remove(userId, investmentId);
   */
  async remove(userId: string, investmentId: string): Promise<void> {
    const investment = await findOwnedOrFail(this.repo, { userId, investmentId }, 'Investimento não encontrado.');
    await this.repo.remove(investment);
  }

  /**
   * Lista as movimentações de um investimento, mais recentes primeiro.
   *
   * @param userId - Dono
   * @param investmentId - Id do investimento
   * @param query - Paginação e filtro por tipo
   * @returns Página de movimentações
   *
   * @example
   * GET /investments/8f9a.../movements
   */
  async findMovements(userId: string, investmentId: string, query: PaginateQuery): Promise<Paginated<InvestmentMovement>> {
    await this.findOne(userId, investmentId);
    return paginate(query, this.movementRepo, {
      where: { userId, investmentId },
      relations: { account: true },
      sortableColumns: ['date', 'amountCents', 'createdAt'],
      defaultSortBy: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      filterableColumns: { kind: [FilterOperator.EQ] },
      defaultLimit: 50,
      maxLimit: 200,
    });
  }

  /**
   * Registra uma movimentação, ajusta o valor atual e, com conta, gera o
   * lançamento de transferência — tudo na mesma transação.
   *
   * @param userId - Dono
   * @param investmentId - Id do investimento
   * @param dto - Tipo, valor, data e conta
   * @returns Investimento atualizado
   * @throws `BadRequestException` com resgate maior que o valor atual
   *
   * @example
   * await investmentsService.addMovement(userId, investmentId, dto);
   */
  async addMovement(userId: string, investmentId: string, dto: CreateMovementDto): Promise<InvestmentWithStats> {
    const investment = await this.findOne(userId, investmentId);
    if (dto.kind === MovementKind.WITHDRAWAL && dto.amountCents > investment.currentValueCents) {
      throw new BadRequestException('O resgate é maior que o valor atual do investimento.');
    }
    const accountId = dto.kind === MovementKind.YIELD ? null : (dto.accountId ?? null);
    const account = accountId ? await this.accountsService.assertOwned(userId, accountId, investment.ledgerId) : null;

    await this.dataSource.transaction(async manager => {
      const movementRepo = manager.getRepository(InvestmentMovement);
      const movement = await movementRepo.save(movementRepo.create({ ...dto, accountId, userId, investmentId }));
      await manager.getRepository(Investment).increment({ investmentId, userId }, 'currentValueCents', VALUE_SIGN[dto.kind] * dto.amountCents);
      if (account) {
        const legRepo = manager.getRepository(Transaction);
        await legRepo.save(
          legRepo.create({
            userId,
            ledgerId: account.ledgerId,
            accountId: account.accountId,
            investmentMovementId: movement.investmentMovementId,
            kind: dto.kind === MovementKind.CONTRIBUTION ? TransactionKind.TRANSFER_OUT : TransactionKind.TRANSFER_IN,
            status: TransactionStatus.PAID,
            amountCents: dto.amountCents,
            date: dto.date,
            description: `${MOVEMENT_LABELS[dto.kind]} · ${investment.name}`.slice(0, 200),
          })
        );
      }
    });

    this.logger.log(`Movimentação ${dto.kind} em ${investmentId}`);
    return this.findOne(userId, investmentId);
  }

  /**
   * Apaga uma movimentação, desfaz o efeito no valor atual e remove o
   * lançamento gerado (`ON DELETE CASCADE`).
   *
   * @param userId - Dono
   * @param investmentId - Id do investimento
   * @param movementId - Id da movimentação
   * @returns Investimento atualizado
   *
   * @example
   * await investmentsService.removeMovement(userId, investmentId, movementId);
   */
  async removeMovement(userId: string, investmentId: string, movementId: string): Promise<InvestmentWithStats> {
    const movement = await findOwnedOrFail(this.movementRepo, { userId, investmentId, investmentMovementId: movementId }, 'Movimentação não encontrada.');
    await this.dataSource.transaction(async manager => {
      await manager.getRepository(InvestmentMovement).remove(movement);
      await manager.getRepository(Investment).decrement({ investmentId, userId }, 'currentValueCents', VALUE_SIGN[movement.kind] * movement.amountCents);
    });
    return this.findOne(userId, investmentId);
  }

  /**
   * Calcula investido, rendimento e retorno de uma lista de investimentos.
   *
   * @param investments - Investimentos carregados
   * @returns Mapa id → números
   */
  private async statsFor(investments: Investment[]): Promise<Map<string, InvestmentStats>> {
    const ids = investments.map(investment => investment.investmentId);
    const rows = ids.length
      ? await this.movementRepo
          .createQueryBuilder('m')
          .select('m.investment_id', 'investmentId')
          .addSelect(`COALESCE(SUM(CASE WHEN m.kind = 'CONTRIBUTION' THEN m.amount_cents WHEN m.kind = 'WITHDRAWAL' THEN -m.amount_cents ELSE 0 END), 0)`, 'invested')
          .addSelect(`COALESCE(SUM(CASE WHEN m.kind = 'YIELD' THEN m.amount_cents ELSE 0 END), 0)`, 'yield')
          .where({ investmentId: In(ids) })
          .groupBy('m.investment_id')
          .getRawMany<{ investmentId: string; invested: string; yield: string }>()
      : [];
    const byId = new Map(rows.map(row => [row.investmentId, row]));
    return new Map(
      investments.map(investment => {
        const row = byId.get(investment.investmentId);
        const investedCents = Number(row?.invested ?? 0);
        const yieldCents = Number(row?.yield ?? 0);
        return [investment.investmentId, { investedCents, yieldCents, returnCents: investment.currentValueCents - investedCents }];
      })
    );
  }
}
