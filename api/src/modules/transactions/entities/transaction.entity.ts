/**
 * Entidade do lançamento financeiro.
 *
 * @module modules/transactions/entities/transaction.entity
 */
import { randomUUID } from 'crypto';
import { BeforeInsert, Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityAbstractTimestamps } from '~/common/abstracts';
import { MoneyColumn } from '~/common/decorators';
import { Account } from '~/modules/accounts/entities/account.entity';
import { Category } from '~/modules/categories/entities/category.entity';
import { InvestmentMovement } from '~/modules/investments/entities/investment-movement.entity';
import { Ledger } from '~/modules/ledgers/entities/ledger.entity';
import { Recurrence } from '~/modules/recurrences/entities/recurrence.entity';
import { User } from '~/modules/users/entities/user.entity';
import { TransactionKind } from '../enums/transaction-kind.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { Transfer } from './transfer.entity';

/**
 * Movimento de dinheiro numa conta. `amountCents` é sempre positivo; o
 * sentido vem de `kind`. `ledgerId` repete o livro da conta para os
 * relatórios agruparem sem join (`ADR-006`).
 *
 * Lançamentos com `transferId` ou `investmentMovementId` são gerados pelo
 * sistema e só mudam pela transferência ou movimentação de origem.
 * Lançamentos com `recurrenceId` foram gerados por um recorrente; podem ser
 * editados, e a edição decide se o mês continua vinculado (`ADR-011`).
 *
 * @example
 * repo.create({ userId, ledgerId, accountId, kind: TransactionKind.EXPENSE, amountCents: 8990, date: '2026-11-14', description: 'Mercado' });
 */
@Entity('transaction')
@Check('ck_transaction_amount_positive', '"amount_cents" > 0')
@Index('ix_transaction_user_date', ['userId', 'date'])
@Index('ix_transaction_ledger_date', ['ledgerId', 'date'])
@Index('uq_transaction_recurrence_month', ['recurrenceId', 'recurrenceMonth'], { unique: true, where: '"recurrence_id" IS NOT NULL' })
export class Transaction extends EntityAbstractTimestamps {
  @PrimaryGeneratedColumn('uuid', { name: 'transaction_id' })
  transactionId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  ledgerId: string;

  @ManyToOne(() => Ledger, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ledger_id' })
  ledger: Ledger;

  @Column({ type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ type: 'enum', enum: TransactionKind, enumName: 'transaction_kind' })
  kind: TransactionKind;

  @Column({ type: 'enum', enum: TransactionStatus, enumName: 'transaction_status', default: TransactionStatus.PAID })
  status: TransactionStatus;

  @MoneyColumn()
  amountCents: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ length: 200 })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column({ type: 'uuid', nullable: true })
  transferId: string | null;

  @ManyToOne(() => Transfer, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'transfer_id' })
  transfer: Transfer | null;

  @Column({ type: 'uuid', nullable: true })
  investmentMovementId: string | null;

  @ManyToOne(() => InvestmentMovement, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'investment_movement_id' })
  investmentMovement: InvestmentMovement | null;

  /** Recorrente que gerou o lançamento; some quando o mês vira exceção. */
  @Column({ type: 'uuid', nullable: true })
  recurrenceId: string | null;

  @ManyToOne(() => Recurrence, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'recurrence_id' })
  recurrence: Recurrence | null;

  /** Mês do contrato que o lançamento representa (`YYYY-MM-01`), mesmo que a data real seja outra. */
  @Column({ type: 'date', nullable: true })
  recurrenceMonth: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @BeforeInsert()
  generateId() {
    if (!this.transactionId) this.transactionId = randomUUID();
  }
}
