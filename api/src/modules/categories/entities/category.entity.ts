/**
 * Entidade da categoria de lançamento.
 *
 * @module modules/categories/entities/category.entity
 */
import { randomUUID } from 'crypto';
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EntityAbstractTimestamps } from '~/common/abstracts';
import { LedgerType } from '~/modules/ledgers/enums/ledger-type.enum';
import { User } from '~/modules/users/entities/user.entity';
import { CategoryKind } from '../enums/category-kind.enum';

/**
 * Categoria de receita ou despesa. `ledgerType` restringe onde ela aparece
 * (só pessoal, só empresas); `null` vale para os dois.
 *
 * @example
 * repo.create({ userId, kind: CategoryKind.EXPENSE, name: 'Mercado', icon: 'shopping-cart', color: 'green' });
 */
@Entity('category')
export class Category extends EntityAbstractTimestamps {
  @PrimaryGeneratedColumn('uuid', { name: 'category_id' })
  categoryId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: CategoryKind, enumName: 'category_kind' })
  kind: CategoryKind;

  @Column({ length: 80 })
  name: string;

  @Column({ length: 20, default: 'gray' })
  color: string;

  /** Nome de um ícone do `lucide-react` (`shopping-cart`, `briefcase`...). */
  @Column({ length: 40, default: 'tag' })
  icon: string;

  @Column({ type: 'enum', enum: LedgerType, enumName: 'category_ledger_type', nullable: true })
  ledgerType: LedgerType | null;

  @Column({ default: false })
  archived: boolean;

  @BeforeInsert()
  generateId() {
    if (!this.categoryId) this.categoryId = randomUUID();
  }
}
