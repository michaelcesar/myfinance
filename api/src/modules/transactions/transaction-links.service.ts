/**
 * Validação dos vínculos de uma receita ou despesa.
 *
 * @module modules/transactions/transaction-links.service
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountsService } from '~/modules/accounts/accounts.service';
import { CategoriesService } from '~/modules/categories/categories.service';
import { CategoryKind } from '~/modules/categories/enums/category-kind.enum';
import { TransactionKind } from './enums/transaction-kind.enum';

/** Ids informados num lançamento ou recorrente. */
export interface TransactionLinks {
  accountId: string;
  categoryId?: string | null;
}

/** Vínculos resolvidos e validados. */
export interface ResolvedLinks {
  ledgerId: string;
}

/**
 * Regras de vínculo compartilhadas pelo lançamento e pelo recorrente: a conta
 * precisa ser do usuário e a categoria, do mesmo tipo.
 *
 * @example
 * const { ledgerId } = await links.resolve(userId, TransactionKind.INCOME, { accountId, categoryId });
 */
@Injectable()
export class TransactionLinksService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService
  ) {}

  /**
   * Valida conta e categoria, e deriva o livro.
   *
   * @param userId - Dono
   * @param kind - Receita ou despesa
   * @param links - Ids informados
   * @returns Livro da conta
   * @throws `BadRequestException` quando um vínculo não combina
   *
   * @example
   * await links.resolve(userId, TransactionKind.EXPENSE, { accountId, categoryId });
   */
  async resolve(userId: string, kind: TransactionKind.INCOME | TransactionKind.EXPENSE, links: TransactionLinks): Promise<ResolvedLinks> {
    const account = await this.accountsService.assertOwned(userId, links.accountId);

    if (links.categoryId) {
      const category = await this.categoriesService.findOne(userId, links.categoryId);
      const expected = kind === TransactionKind.INCOME ? CategoryKind.INCOME : CategoryKind.EXPENSE;
      if (category.kind !== expected) throw new BadRequestException('A categoria não combina com o tipo do lançamento.');
    }

    return { ledgerId: account.ledgerId };
  }
}
