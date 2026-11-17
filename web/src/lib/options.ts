/**
 * Conversão de entidades em opções de seletor.
 *
 * @module lib/options
 */
import type { SelectOption } from '@/components/ui/Field';
import type { Account, Category, CategoryKind, Ledger, LedgerType } from '@/types/entities';

/**
 * Contas agrupadas pelo livro ("Pessoal", "Studio Aurora"...).
 *
 * @param accounts - Contas
 * @param ledgers - Livros, para nomear os grupos
 * @returns Opções com `group`
 */
export function accountOptions(accounts: Account[], ledgers: Ledger[]): SelectOption[] {
  const order = new Map(ledgers.map((ledger, index) => [ledger.ledgerId, index]));
  const names = new Map(ledgers.map(ledger => [ledger.ledgerId, ledger.name]));
  return [...accounts]
    .sort((a, b) => (order.get(a.ledgerId) ?? 99) - (order.get(b.ledgerId) ?? 99) || a.name.localeCompare(b.name))
    .map(account => ({ value: account.accountId, label: account.name, group: names.get(account.ledgerId) ?? account.ledger?.name ?? 'Outros' }));
}

/**
 * Categorias de um tipo, filtradas pelo tipo de livro quando informado.
 *
 * @param categories - Todas as categorias
 * @param kind - Receita ou despesa
 * @param ledgerType - Tipo do livro da conta escolhida
 * @returns Opções ordenadas por nome
 */
export function categoryOptions(categories: Category[], kind: CategoryKind, ledgerType?: LedgerType): SelectOption[] {
  return categories
    .filter(category => category.kind === kind && !category.archived && (!ledgerType || !category.ledgerType || category.ledgerType === ledgerType))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(category => ({ value: category.categoryId, label: category.name }));
}

/**
 * Livros como opções.
 *
 * @param ledgers - Livros
 * @returns Opções
 */
export function ledgerOptions(ledgers: Ledger[]): SelectOption[] {
  return ledgers.map(ledger => ({ value: ledger.ledgerId, label: ledger.name }));
}

/** Lista de contas vazia: aviso e opção de criar. */
export const EMPTY_ACCOUNTS = { message: 'Nenhuma conta cadastrada', createLabel: '+ Criar conta' } as const;

/** Lista de categorias vazia: aviso e opção de criar. */
export const EMPTY_CATEGORIES = { message: 'Nenhuma categoria deste tipo', createLabel: '+ Criar categoria' } as const;
