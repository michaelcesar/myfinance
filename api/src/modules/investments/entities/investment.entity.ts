/**
 * Entidade do investimento.
 *
 * @module modules/investments/entities/investment.entity
 */
import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityAbstractTimestamps } from '~/common/abstracts';
import { MoneyColumn } from '~/common/decorators';
import { Ledger } from '~/modules/ledgers/entities/ledger.entity';
import { User } from '~/modules/users/entities/user.entity';
import { InvestmentType } from '../enums/investment-type.enum';

/**
 * Um ativo da carteira de um livro. O valor investido sai das
 * movimentações; o valor atual é informado à mão (`currentValueCents`) e
 * somado pelos rendimentos lançados (`ADR-007`).
 *
 * @example
 * repo.create({ userId, ledgerId, name: 'CDB Banco X 120% CDI', type: InvestmentType.FIXED_INCOME });
 */
@Entity('investment')
export class Investment extends EntityAbstractTimestamps {
  @PrimaryGeneratedColumn('uuid', { name: 'investment_id' })
  investmentId: string;

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

  @Column({ length: 160 })
  name: string;

  @Column({ type: 'enum', enum: InvestmentType, enumName: 'investment_type' })
  type: InvestmentType;

  @Column({ type: 'varchar', length: 120, nullable: true })
  institution: string | null;

  /** Valor de mercado na última atualização. */
  @MoneyColumn({ default: 0 })
  currentValueCents: number;

  @Column({ type: 'date', nullable: true })
  valuedAt: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: false })
  archived: boolean;

  @BeforeInsert()
  generateId() {
    if (!this.investmentId) this.investmentId = randomUUID();
  }
}
