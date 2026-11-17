/**
 * Entidade da transferência entre contas.
 *
 * @module modules/transactions/entities/transfer.entity
 */
import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityAbstractTimestamps } from '~/common/abstracts';
import { MoneyColumn } from '~/common/decorators';
import { Account } from '~/modules/accounts/entities/account.entity';
import { User } from '~/modules/users/entities/user.entity';
import { TransferKind } from '../enums/transfer-kind.enum';

/**
 * Cabeçalho de uma transferência. Cada transferência gera exatamente dois
 * lançamentos — `TRANSFER_OUT` na origem e `TRANSFER_IN` no destino — que
 * apontam para cá e são apagados junto (`ADR-005`).
 *
 * @example
 * repo.create({ userId, fromAccountId, toAccountId, amountCents: 500000, kind: TransferKind.PRO_LABORE, date: '2026-11-05' });
 */
@Entity('transfer')
export class Transfer extends EntityAbstractTimestamps {
  @PrimaryGeneratedColumn('uuid', { name: 'transfer_id' })
  transferId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  fromAccountId: string;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_account_id' })
  fromAccount: Account;

  @Column({ type: 'uuid' })
  toAccountId: string;

  @ManyToOne(() => Account, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_account_id' })
  toAccount: Account;

  @MoneyColumn()
  amountCents: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: TransferKind, enumName: 'transfer_kind', default: TransferKind.INTERNAL })
  kind: TransferKind;

  @Column({ length: 200 })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @BeforeInsert()
  generateId() {
    if (!this.transferId) this.transferId = randomUUID();
  }
}
