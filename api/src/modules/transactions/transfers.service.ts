/**
 * Serviço de transferências entre contas.
 *
 * @module modules/transactions/transfers.service
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { findOwnedOrFail } from '~/common/utils';
import { AccountsService } from '~/modules/accounts/accounts.service';
import { type CreateTransferDto } from './dto/create-transfer.dto';
import { type UpdateTransferDto } from './dto/update-transfer.dto';
import { Transaction } from './entities/transaction.entity';
import { Transfer } from './entities/transfer.entity';
import { TransactionKind } from './enums/transaction-kind.enum';
import { TransactionStatus } from './enums/transaction-status.enum';
import { TransferKind } from './enums/transfer-kind.enum';

/** Descrição padrão por motivo, quando o usuário não escreve uma. */
export const TRANSFER_KIND_LABELS: Record<TransferKind, string> = {
  [TransferKind.INTERNAL]: 'Transferência',
  [TransferKind.PRO_LABORE]: 'Pró-labore',
  [TransferKind.PROFIT_DISTRIBUTION]: 'Distribuição de lucros',
  [TransferKind.CAPITAL_CONTRIBUTION]: 'Aporte de capital',
  [TransferKind.LOAN]: 'Empréstimo',
  [TransferKind.REIMBURSEMENT]: 'Reembolso',
};

/** Transferência com as duas pernas carregadas. */
export type TransferWithLegs = Omit<Transfer, 'generateId'> & { legs: Transaction[] };

/**
 * Cria, edita e apaga transferências. Cada uma grava, na mesma transação
 * do banco, o cabeçalho e as duas pernas (`TRANSFER_OUT` + `TRANSFER_IN`),
 * cada perna no livro da sua conta (`ADR-005`).
 *
 * @example
 * await transfersService.create(userId, { fromAccountId: companyAccount, toAccountId: personalAccount, amountCents: 800000, date: '2026-11-05', kind: TransferKind.PRO_LABORE });
 */
@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    @InjectRepository(Transfer) private readonly repo: Repository<Transfer>,
    @InjectRepository(Transaction) private readonly transactionRepo: Repository<Transaction>,
    private readonly accountsService: AccountsService,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Busca uma transferência com as pernas.
   *
   * @param userId - Dono
   * @param transferId - Id da transferência
   * @returns Transferência, contas e pernas
   * @throws `NotFoundException` se não existir ou for de outro usuário
   *
   * @example
   * await transfersService.findOne(userId, transferId);
   */
  async findOne(userId: string, transferId: string): Promise<TransferWithLegs> {
    const transfer = await findOwnedOrFail(this.repo, { userId, transferId }, 'Transferência não encontrada.', { fromAccount: true, toAccount: true });
    const legs = await this.transactionRepo.find({ where: { userId, transferId }, order: { kind: 'ASC' } });
    return { ...transfer, legs };
  }

  /**
   * Cria a transferência e as duas pernas.
   *
   * @param userId - Dono
   * @param dto - Contas, valor, data e motivo
   * @returns Transferência criada
   * @throws `BadRequestException` com origem igual ao destino
   *
   * @example
   * await transfersService.create(userId, dto);
   */
  async create(userId: string, dto: CreateTransferDto): Promise<TransferWithLegs> {
    if (dto.fromAccountId === dto.toAccountId) throw new BadRequestException('Origem e destino precisam ser contas diferentes.');
    const [from, to] = await Promise.all([this.accountsService.assertOwned(userId, dto.fromAccountId), this.accountsService.assertOwned(userId, dto.toAccountId)]);
    const kind = dto.kind ?? TransferKind.INTERNAL;
    const description = dto.description?.trim() || TRANSFER_KIND_LABELS[kind];

    const transferId = await this.dataSource.transaction(async manager => {
      const transferRepo = manager.getRepository(Transfer);
      const legRepo = manager.getRepository(Transaction);
      const transfer = await transferRepo.save(transferRepo.create({ ...dto, kind, description, userId }));
      const base = { userId, transferId: transfer.transferId, amountCents: dto.amountCents, date: dto.date, description, status: TransactionStatus.PAID, notes: dto.notes ?? null };
      await legRepo.save([
        legRepo.create({ ...base, kind: TransactionKind.TRANSFER_OUT, accountId: from.accountId, ledgerId: from.ledgerId }),
        legRepo.create({ ...base, kind: TransactionKind.TRANSFER_IN, accountId: to.accountId, ledgerId: to.ledgerId }),
      ]);
      return transfer.transferId;
    });

    this.logger.log(`Transferência criada: ${transferId}`);
    return this.findOne(userId, transferId);
  }

  /**
   * Edita valor, data, motivo, descrição ou observação nas duas pernas.
   *
   * @param userId - Dono
   * @param transferId - Id da transferência
   * @param dto - Campos alterados
   * @returns Transferência atualizada
   *
   * @example
   * await transfersService.update(userId, transferId, { amountCents: 900000 });
   */
  async update(userId: string, transferId: string, dto: UpdateTransferDto): Promise<TransferWithLegs> {
    const current = await this.findOne(userId, transferId);
    const kind = dto.kind ?? current.kind;
    const description = dto.description?.trim() || (dto.kind && current.description === TRANSFER_KIND_LABELS[current.kind] ? TRANSFER_KIND_LABELS[kind] : current.description);
    const changes = {
      amountCents: dto.amountCents ?? current.amountCents,
      date: dto.date ?? current.date,
      description,
      notes: dto.notes !== undefined ? dto.notes : current.notes,
    };

    await this.dataSource.transaction(async manager => {
      await manager.getRepository(Transfer).update({ transferId, userId }, { ...changes, kind });
      await manager.getRepository(Transaction).update({ transferId, userId }, changes);
    });
    return this.findOne(userId, transferId);
  }

  /**
   * Apaga a transferência; as pernas saem junto (`ON DELETE CASCADE`).
   *
   * @param userId - Dono
   * @param transferId - Id da transferência
   *
   * @example
   * await transfersService.remove(userId, transferId);
   */
  async remove(userId: string, transferId: string): Promise<void> {
    const transfer = await findOwnedOrFail(this.repo, { userId, transferId }, 'Transferência não encontrada.');
    await this.repo.remove(transfer);
  }
}
