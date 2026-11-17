/**
 * Categorias criadas no cadastro de todo usuário.
 *
 * @module modules/categories/default-categories
 */
import { LedgerType } from '~/modules/ledgers/enums/ledger-type.enum';
import { CategoryKind } from './enums/category-kind.enum';

/** Molde de categoria padrão. */
export interface DefaultCategory {
  kind: CategoryKind;
  name: string;
  icon: string;
  color: string;
  ledgerType: LedgerType | null;
}

const { INCOME, EXPENSE } = CategoryKind;
const { PERSONAL, COMPANY } = LedgerType;

/**
 * Ponto de partida editável: o usuário renomeia, arquiva ou cria as
 * próprias. Ícones são nomes do `lucide-react`.
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { kind: INCOME, name: 'Salário', icon: 'briefcase', color: 'green', ledgerType: PERSONAL },
  { kind: INCOME, name: 'Serviços prestados', icon: 'handshake', color: 'teal', ledgerType: null },
  { kind: INCOME, name: 'Freelance', icon: 'laptop', color: 'cyan', ledgerType: PERSONAL },
  { kind: INCOME, name: 'Faturamento', icon: 'receipt', color: 'green', ledgerType: COMPANY },
  { kind: INCOME, name: 'Rendimentos', icon: 'trending-up', color: 'mint', ledgerType: null },
  { kind: INCOME, name: 'Outras receitas', icon: 'circle-plus', color: 'gray', ledgerType: null },
  { kind: EXPENSE, name: 'Mercado', icon: 'shopping-cart', color: 'green', ledgerType: PERSONAL },
  { kind: EXPENSE, name: 'Alimentação', icon: 'utensils', color: 'orange', ledgerType: null },
  { kind: EXPENSE, name: 'Moradia', icon: 'house', color: 'brown', ledgerType: PERSONAL },
  { kind: EXPENSE, name: 'Transporte', icon: 'car', color: 'blue', ledgerType: null },
  { kind: EXPENSE, name: 'Saúde', icon: 'heart-pulse', color: 'red', ledgerType: PERSONAL },
  { kind: EXPENSE, name: 'Educação', icon: 'graduation-cap', color: 'indigo', ledgerType: null },
  { kind: EXPENSE, name: 'Lazer', icon: 'party-popper', color: 'pink', ledgerType: PERSONAL },
  { kind: EXPENSE, name: 'Vestuário', icon: 'shirt', color: 'purple', ledgerType: PERSONAL },
  { kind: EXPENSE, name: 'Assinaturas', icon: 'repeat', color: 'purple', ledgerType: null },
  { kind: EXPENSE, name: 'Software e ferramentas', icon: 'app-window', color: 'cyan', ledgerType: COMPANY },
  { kind: EXPENSE, name: 'Fornecedores', icon: 'package', color: 'teal', ledgerType: COMPANY },
  { kind: EXPENSE, name: 'Marketing', icon: 'megaphone', color: 'pink', ledgerType: COMPANY },
  { kind: EXPENSE, name: 'Contabilidade', icon: 'calculator', color: 'mint', ledgerType: COMPANY },
  { kind: EXPENSE, name: 'Salários', icon: 'users', color: 'indigo', ledgerType: COMPANY },
  { kind: EXPENSE, name: 'Impostos', icon: 'landmark', color: 'gray', ledgerType: null },
  { kind: EXPENSE, name: 'Tarifas bancárias', icon: 'banknote', color: 'gray', ledgerType: null },
  { kind: EXPENSE, name: 'Outros gastos', icon: 'ellipsis', color: 'gray', ledgerType: null },
];
