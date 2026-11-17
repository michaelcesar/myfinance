/**
 * Entidade do recorrente (contrato ou conta fixa mensal).
 *
 * @module modules/recurrences/entities/recurrence.entity
 */
import { randomUUID } from 'crypto';
import { BeforeInsert, Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityAbstractTimestamps } from '~/common/abstracts';
import { MoneyColumn } from '~/common/decorators';
import { Account } from '~/modules/accounts/entities/account.entity';
import { Category } from '~/modules/categories/entities/category.entity';
import { Ledger } from '~/modules/ledgers/entities/ledger.entity';
import { TransactionKind } from '~/modules/transactions/enums/transaction-kind.enum';
import { User } from '~/modules/users/entities/user.entity';

/**
 * Receita ou despesa que se repete todo mês. O sistema mantém os próximos
 * meses criados como lançamentos pendentes vinculados (`recurrenceId`), e é
 * dono deles enquanto estiverem pendentes (`ADR-011`). `ledgerId` repete o
 * livro da conta, como no lançamento.
 *
 * @example
 * repo.create({ userId, ledgerId, accountId, kind: TransactionKind.INCOME, description: 'Contrato Acme', amountCents: 900000, dayOfMonth: 10, startMonth: '2026-11-01' });
 */
@Entity('recurrence')
@Check('ck_recurrence_amount_positive', '"amount_cents" > 0')
@Check('ck_recurrence_day_of_month', '"day_of_month" BETWEEN 1 AND 31')
@Check('ck_recurrence_day_window', '"day_of_month_start" IS NULL OR "day_of_month_start" BETWEEN 1 AND "day_of_month"')
@Check('ck_recurrence_end_after_start', '"end_month" IS NULL OR "end_month" >= "start_month"')
@Index('ix_recurrence_user_ledger', ['userId', 'ledgerId'])
export class Recurrence extends EntityAbstractTimestamps {
  @PrimaryGeneratedColumn('uuid', { name: 'recurrence_id' })
  recurrenceId: string;

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

  /** Só receita ou despesa; não muda depois de criado. */
  @Column({ type: 'enum', enum: TransactionKind, enumName: 'transaction_kind' })
  kind: TransactionKind.INCOME | TransactionKind.EXPENSE;

  @Column({ length: 200 })
  description: string;

  @MoneyColumn()
  amountCents: number;

  /** Dia do vencimento (o prazo); num mês sem esse dia, vale o último dia. É a data do pendente. */
  @Column({ type: 'smallint' })
  dayOfMonth: number;

  /** Primeiro dia da janela de recebimento ("entre dia 1 e 5"); `null` = dia fixo. */
  @Column({ type: 'smallint', nullable: true })
  dayOfMonthStart: number | null;

  /** Primeiro mês do contrato (`YYYY-MM-01`). */
  @Column({ type: 'date' })
  startMonth: string;

  /** Último mês do contrato, inclusive (`YYYY-MM-01`); `null` = sem fim. */
  @Column({ type: 'date', nullable: true })
  endMonth: string | null;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @BeforeInsert()
  generateId() {
    if (!this.recurrenceId) this.recurrenceId = randomUUID();
  }
}
