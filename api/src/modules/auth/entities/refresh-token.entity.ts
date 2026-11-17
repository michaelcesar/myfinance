/**
 * Entidade do token de renovação de sessão.
 *
 * @module modules/auth/entities/refresh-token.entity
 */
import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityAbstractTimestamps } from '~/common/abstracts';
import { User } from '~/modules/users/entities/user.entity';

/**
 * Refresh token rotativo. O valor em claro vive só no cookie `httpOnly`;
 * o banco guarda o SHA-256 dele.
 *
 * @example
 * repo.create({ userId, tokenHash: sha256(token), expiresAt });
 */
@Entity('refresh_token')
export class RefreshToken extends EntityAbstractTimestamps {
  @PrimaryGeneratedColumn('uuid', { name: 'refresh_token_id' })
  refreshTokenId: string;

  @Index({ unique: true })
  @Column({ length: 64 })
  tokenHash: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @BeforeInsert()
  generateId() {
    if (!this.refreshTokenId) this.refreshTokenId = randomUUID();
  }
}
