/**
 * Entidade do livro financeiro: o pessoal ou o de uma empresa.
 *
 * @module modules/ledgers/entities/ledger.entity
 */
import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityAbstractTimestamps } from '~/common/abstracts';
import { User } from '~/modules/users/entities/user.entity';
import { LedgerType } from '../enums/ledger-type.enum';

/**
 * Um livro separa o dinheiro de um dono: o próprio usuário (`PERSONAL`) ou
 * cada empresa dele (`COMPANY`). Contas, lançamentos, fontes de renda e
 * investimentos pertencem a um livro (`ADR-005`).
 *
 * O índice parcial garante um único livro pessoal por usuário.
 *
 * @example
 * repo.create({ userId, type: LedgerType.COMPANY, name: 'Studio Ltda', document: '12345678000190' });
 */
@Entity('ledger')
@Index('uq_ledger_personal_per_user', ['userId'], { unique: true, where: `"type" = 'PERSONAL'` })
export class Ledger extends EntityAbstractTimestamps {
  @PrimaryGeneratedColumn('uuid', { name: 'ledger_id' })
  ledgerId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: LedgerType, enumName: 'ledger_type' })
  type: LedgerType;

  /** Nome de exibição (nome fantasia, no caso de empresa). */
  @Column({ length: 120 })
  name: string;

  /** Razão social. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  legalName: string | null;

  /** CNPJ (empresa) ou CPF (pessoal), só dígitos. */
  @Column({ type: 'varchar', length: 14, nullable: true })
  document: string | null;

  /** Nome de uma cor da paleta do front (`blue`, `green`, `orange`...). */
  @Column({ length: 20, default: 'blue' })
  color: string;

  @Column({ default: false })
  archived: boolean;

  @BeforeInsert()
  generateId() {
    if (!this.ledgerId) this.ledgerId = randomUUID();
  }
}
