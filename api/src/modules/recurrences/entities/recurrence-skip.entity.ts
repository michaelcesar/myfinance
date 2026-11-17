/**
 * Entidade do mês que o dono tirou de um recorrente.
 *
 * @module modules/recurrences/entities/recurrence-skip.entity
 */
import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityAbstractTimestamps } from '~/common/abstracts';
import { User } from '~/modules/users/entities/user.entity';
import { Recurrence } from './recurrence.entity';

/**
 * Mês que o dono apagou ou desvinculou de um recorrente. O gerador nunca
 * recria um mês listado aqui. Meses que o próprio sistema removeu
 * (encerramento, início movido) não entram, por isso voltam ao reabrir.
 *
 * @example
 * repo.create({ userId, recurrenceId, month: '2026-12-01' });
 */
@Entity('recurrence_skip')
@Index('uq_recurrence_skip_month', ['recurrenceId', 'month'], { unique: true })
export class RecurrenceSkip extends EntityAbstractTimestamps {
  /** Id próprio, porque o backup exige chave uuid em toda tabela. */
  @PrimaryGeneratedColumn('uuid', { name: 'recurrence_skip_id' })
  recurrenceSkipId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  recurrenceId: string;

  @ManyToOne(() => Recurrence, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recurrence_id' })
  recurrence: Recurrence;

  /** Mês tirado (`YYYY-MM-01`). */
  @Column({ type: 'date' })
  month: string;

  @BeforeInsert()
  generateId() {
    if (!this.recurrenceSkipId) this.recurrenceSkipId = randomUUID();
  }
}
