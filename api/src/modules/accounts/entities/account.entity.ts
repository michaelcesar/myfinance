/**
 * Entidade da conta financeira (banco, carteira, cartão, corretora).
 *
 * @module modules/accounts/entities/account.entity
 */
import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityAbstractTimestamps } from '~/common/abstracts';
import { MoneyColumn } from '~/common/decorators';
import { Ledger } from '~/modules/ledgers/entities/ledger.entity';
import { User } from '~/modules/users/entities/user.entity';
import { AccountType } from '../enums/account-type.enum';

/**
 * Conta de um livro. O saldo não é gravado: é `initialBalanceCents` mais a
 * soma dos lançamentos pagos (`ADR-006`), calculado em `AccountsService`.
 *
 * @example
 * repo.create({ userId, ledgerId, name: 'Nubank', type: AccountType.CHECKING, initialBalanceCents: 150000 });
 */
@Entity('account')
export class Account extends EntityAbstractTimestamps {
  @PrimaryGeneratedColumn('uuid', { name: 'account_id' })
  accountId: string;

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

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'enum', enum: AccountType, enumName: 'account_type' })
  type: AccountType;

  @Column({ type: 'varchar', length: 120, nullable: true })
  institution: string | null;

  /** Saldo no dia em que a conta passou a ser acompanhada. */
  @MoneyColumn({ default: 0 })
  initialBalanceCents: number;

  @Column({ length: 20, default: 'blue' })
  color: string;

  @Column({ default: false })
  archived: boolean;

  /** Rendimento informado pelo dono, em % ao ano (ex.: 11,15); `null` = não rende. Só estima, nada é lançado. */
  @Column({ type: 'numeric', precision: 7, scale: 4, nullable: true, transformer: { to: (value?: number | null) => value, from: (value: string | null) => (value === null ? null : Number(value)) } })
  annualYieldRate: number | null;

  @BeforeInsert()
  generateId() {
    if (!this.accountId) this.accountId = randomUUID();
  }
}
