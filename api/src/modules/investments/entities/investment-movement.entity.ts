/**
 * Entidade da movimentação de um investimento.
 *
 * @module modules/investments/entities/investment-movement.entity
 */
import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityAbstractTimestamps } from '~/common/abstracts';
import { MoneyColumn } from '~/common/decorators';
import { Account } from '~/modules/accounts/entities/account.entity';
import { User } from '~/modules/users/entities/user.entity';
import { MovementKind } from '../enums/movement-kind.enum';
import { Investment } from './investment.entity';

/**
 * Aporte, resgate ou rendimento. Com `accountId`, aporte e resgate também
 * geram um lançamento de transferência na conta, para o saldo acompanhar.
 *
 * @example
 * repo.create({ userId, investmentId, kind: MovementKind.CONTRIBUTION, amountCents: 100000, date: '2026-11-10', accountId });
 */
@Entity('investment_movement')
export class InvestmentMovement extends EntityAbstractTimestamps {
  @PrimaryGeneratedColumn('uuid', { name: 'investment_movement_id' })
  investmentMovementId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  investmentId: string;

  @ManyToOne(() => Investment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'investment_id' })
  investment: Investment;

  @Column({ type: 'enum', enum: MovementKind, enumName: 'movement_kind' })
  kind: MovementKind;

  @MoneyColumn()
  amountCents: number;

  @Column({ type: 'date' })
  date: string;

  /** Conta de onde saiu o aporte ou para onde voltou o resgate. */
  @Column({ type: 'uuid', nullable: true })
  accountId: string | null;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'account_id' })
  account: Account | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @BeforeInsert()
  generateId() {
    if (!this.investmentMovementId) this.investmentMovementId = randomUUID();
  }
}
