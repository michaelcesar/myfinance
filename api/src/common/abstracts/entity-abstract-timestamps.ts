/**
 * Base de toda entidade: carimbos de criação e atualização.
 *
 * @module common/abstracts/entity-abstract-timestamps
 */
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Fornece `createdAt`/`updatedAt` em `timestamptz`. A chave primária fica
 * na entidade concreta, sempre UUID nomeado (`ledgerId`, `accountId`...).
 *
 * @example
 * @Entity('ledger')
 * export class Ledger extends EntityAbstractTimestamps { ... }
 */
export abstract class EntityAbstractTimestamps {
  /** Momento da criação do registro. */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /** Momento da última alteração do registro. */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
