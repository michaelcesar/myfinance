/**
 * Estrutura do menu: itens soltos, grupos com submenu e o rodapé.
 *
 * Mesma organização do menu do juscia — itens de primeiro nível e grupos que
 * abrem para mostrar os filhos. O grupo "Livros" ganha as empresas do
 * usuário em tempo de execução (`Sidebar`).
 *
 * @module components/layout/navigation
 */
import { ArrowLeftRight, BarChart3, BookOpen, Building2, FolderOpen, LayoutGrid, LineChart, type LucideIcon, Repeat, Settings, TrendingUp, User, Wallet } from 'lucide-react';

/** Item de navegação. */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Grupo com submenu. */
export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavItem[];
}

/** Itens de primeiro nível. */
export const PRIMARY_NAV: NavItem[] = [
  { href: '/visao-geral', label: 'Visão geral', icon: LayoutGrid },
  { href: '/previsao', label: 'Previsão', icon: LineChart },
  { href: '/analises', label: 'Análises', icon: BarChart3 },
  { href: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight },
  { href: '/investimentos', label: 'Investimentos', icon: TrendingUp },
];

/** Livros: pessoal e empresas (as empresas entram no `Sidebar`). */
export const BOOKS_GROUP: NavGroup = {
  id: 'livros',
  label: 'Livros',
  icon: BookOpen,
  children: [
    { href: '/pessoal', label: 'Pessoal', icon: User },
    { href: '/empresas', label: 'Todas as empresas', icon: Building2 },
  ],
};

/** Cadastros de apoio. */
export const REGISTRY_GROUP: NavGroup = {
  id: 'cadastros',
  label: 'Cadastros',
  icon: FolderOpen,
  children: [
    { href: '/contas', label: 'Contas', icon: Wallet },
    { href: '/recorrentes', label: 'Recorrentes', icon: Repeat },
  ],
};

/** Rodapé do menu. */
export const SETTINGS_NAV: NavItem = { href: '/configuracoes', label: 'Configurações', icon: Settings };

/**
 * Diz se o caminho atual pertence ao item (a própria rota ou uma filha).
 *
 * @param pathname - Caminho atual
 * @param href - Rota do item
 * @param exact - Só a própria rota (para "Todas as empresas", que é pai das empresas)
 * @returns `true` quando o item deve aparecer selecionado
 *
 * @example
 * isActive('/empresas/123', '/empresas'); // true
 * isActive('/empresas/123', '/empresas', true); // false
 */
export function isActive(pathname: string, href: string, exact = false): boolean {
  return pathname === href || (!exact && pathname.startsWith(`${href}/`));
}

/**
 * Diz se algum filho do grupo está ativo — o grupo abre sozinho nesse caso.
 *
 * @param pathname - Caminho atual
 * @param items - Filhos do grupo
 * @returns `true` quando a rota atual está dentro do grupo
 */
export function groupContains(pathname: string, items: NavItem[]): boolean {
  return items.some(item => isActive(pathname, item.href));
}
