/**
 * Entidade do dono das finanças.
 *
 * @module modules/users/entities/user.entity
 */
import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntityAbstractTimestamps } from '~/common/abstracts';

/**
 * Usuário do sistema. Todo dado financeiro pertence a um usuário, e toda
 * consulta filtra por `userId` (`CONSTRAINTS.md` C06).
 *
 * @example
 * const user = repo.create({ name: 'Ana', email: 'ana@exemplo.com', passwordHash });
 */
@Entity('user_account')
export class User extends EntityAbstractTimestamps {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column({ length: 120 })
  name: string;

  /** Sempre minúsculo e sem espaços nas pontas — normalizado no DTO. */
  @Column({ length: 254, unique: true })
  email: string;

  /** Hash bcrypt; nunca sai em resposta (ver `toJSON`). */
  @Column({ select: false })
  passwordHash: string;

  @BeforeInsert()
  generateId() {
    if (!this.userId) this.userId = randomUUID();
  }

  /**
   * Remove o hash da senha de qualquer serialização.
   *
   * @returns Cópia sem `passwordHash`
   *
   * @example
   * JSON.stringify(user); // sem passwordHash
   */
  toJSON(): Omit<User, 'passwordHash' | 'generateId' | 'toJSON'> {
    const { passwordHash: _passwordHash, ...rest } = this;
    return rest;
  }
}
