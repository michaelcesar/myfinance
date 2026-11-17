/**
 * Conteúdo do menu lateral, no padrão do menu do juscia: itens soltos,
 * grupos que abrem um submenu e rodapé com configurações e usuário, sem marca
 * e sem botão de recolher: no desktop, um clique numa área vazia do menu
 * alterna aberto/recolhido e `Esc` recolhe (`AppShell`). Clicar num item só
 * navega; a exceção é um grupo (Livros, Cadastros) no menu recolhido, que
 * expande o menu para mostrar o submenu.
 *
 * O mesmo componente serve aos dois modos. No desktop vive no painel
 * flutuante e recolhe para uma faixa só de ícones (com dica ao passar o
 * mouse); na gaveta do celular aparece sempre aberto, com um X no topo.
 * Quem guarda os estados (recolhido, gaveta aberta) é o `AppShell`.
 *
 * @module components/layout/Sidebar
 */
'use client';

import { ChevronDown, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip } from 'radix-ui';
import { type ReactNode, useState } from 'react';
import { useLedgers } from '@/hooks/useFinance';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { PRODUCT_NAME } from './BrandMark';
import { BOOKS_GROUP, groupContains, isActive, type NavGroup, type NavItem, PRIMARY_NAV, REGISTRY_GROUP, SETTINGS_NAV } from './navigation';

/** Propriedades do menu. */
export interface SidebarProps {
  /** Faixa recolhida, só com ícones (ignorado na gaveta). */
  collapsed: boolean;
  /** Dentro da gaveta do celular: o botão do topo fecha em vez de recolher. */
  mobile?: boolean;
  /** Fecha a gaveta do celular (o X do topo). No desktop o menu alterna com um clique numa área vazia e recolhe com Esc (`AppShell`). */
  onToggle: () => void;
  /** Expande a faixa recolhida (ao tocar num grupo). */
  onExpand: () => void;
  /** Depois de seguir um link (a gaveta fecha). */
  onNavigate?: () => void;
  /** Abre a folha de nova empresa. */
  onCreateCompany: () => void;
}

const ITEM_CLASS = 'relative flex h-10 w-full items-center gap-3 rounded-full px-3 text-subhead transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring';
const ACTIVE_CLASS = 'font-semibold text-fg';
const IDLE_CLASS = 'text-fg-muted hover:bg-fill-2 hover:text-fg';
const SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const;
const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * Dica à direita do item quando o menu está recolhido.
 *
 * @param props - Texto, se está ligada e o gatilho
 * @returns Gatilho, com a dica quando ligada
 */
function NavTooltip({ label, enabled, children }: { label: string; enabled: boolean; children: ReactNode }) {
  if (!enabled) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side='right' sideOffset={12} className='z-(--z-tooltip) rounded-md bg-primary px-2.5 py-1.5 text-caption font-medium text-primary-fg shadow-float'>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * Realce do item ativo; desliza entre os itens (`layoutId`).
 *
 * @param props - Escopo do `layoutId` (o menu do desktop e o da gaveta não se misturam)
 * @returns Pílula de fundo
 */
function ActivePill({ scope }: { scope: string }) {
  return <motion.span layoutId={`${scope}-nav-active`} className='absolute inset-0 rounded-full bg-fill' transition={SPRING} />;
}

/** Propriedades de um link do menu. */
interface NavLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  scope: string;
  child?: boolean;
  leading?: ReactNode;
  onNavigate?: () => void;
}

/**
 * Link do menu: ícone e rótulo; recolhido, só o ícone com dica.
 *
 * @param props - Item, estado e callbacks
 * @returns Link
 */
function NavLink({ item, active, collapsed, scope, child = false, leading, onNavigate }: NavLinkProps) {
  const Icon = item.icon;
  return (
    <NavTooltip label={item.label} enabled={collapsed}>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={cn(ITEM_CLASS, child && 'h-9', collapsed && 'justify-center px-0', active ? ACTIVE_CLASS : IDLE_CLASS)}
      >
        {active && <ActivePill scope={scope} />}
        <span className='relative flex min-w-0 items-center gap-3'>
          {leading ?? <Icon className={cn('shrink-0', child ? 'size-4' : 'size-[18px]')} strokeWidth={active ? 2.3 : 2} />}
          {!collapsed && <span className='truncate'>{item.label}</span>}
        </span>
      </Link>
    </NavTooltip>
  );
}

/** Filho de um grupo: o item, se casa só a rota exata e um ícone próprio opcional. */
interface GroupEntry {
  item: NavItem;
  exact?: boolean;
  leading?: ReactNode;
}

/** Propriedades de um grupo do menu. */
interface NavGroupItemProps {
  group: NavGroup;
  entries: GroupEntry[];
  open: boolean;
  collapsed: boolean;
  scope: string;
  pathname: string;
  onToggle: () => void;
  onNavigate?: () => void;
  footer?: ReactNode;
}

/**
 * Grupo com submenu: o botão abre e fecha a lista de filhos, que entra com
 * animação de altura. Recolhido, mostra só o ícone (realçado quando a rota
 * atual está dentro dele).
 *
 * @param props - Grupo, filhos, estado e callbacks
 * @returns Item de lista com o submenu
 */
function NavGroupItem({ group, entries, open, collapsed, scope, pathname, onToggle, onNavigate, footer }: NavGroupItemProps) {
  const Icon = group.icon;
  const containsActive = groupContains(
    pathname,
    entries.map(entry => entry.item)
  );
  const expanded = open && !collapsed;
  return (
    <li>
      <NavTooltip label={group.label} enabled={collapsed}>
        <button
          type='button'
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={collapsed ? group.label : undefined}
          className={cn(ITEM_CLASS, collapsed && 'justify-center px-0', collapsed && containsActive ? `bg-fill ${ACTIVE_CLASS}` : IDLE_CLASS)}
        >
          <Icon className='size-[18px] shrink-0' strokeWidth={containsActive ? 2.3 : 2} />
          {!collapsed && (
            <>
              <span className={cn('truncate', containsActive && 'text-fg')}>{group.label}</span>
              <ChevronDown className={cn('ml-auto size-4 shrink-0 text-fg-subtle transition-transform duration-300 ease-apple', expanded && 'rotate-180')} />
            </>
          )}
        </button>
      </NavTooltip>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className='overflow-hidden'
          >
            <ul className='mt-0.5 ml-5 flex flex-col gap-0.5 border-l border-border py-0.5 pl-2'>
              {entries.map(({ item, exact, leading }) => (
                <li key={item.href}>
                  <NavLink item={item} active={isActive(pathname, item.href, exact)} collapsed={false} scope={scope} child leading={leading} onNavigate={onNavigate} />
                </li>
              ))}
              {footer && <li>{footer}</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/**
 * Menu lateral completo.
 *
 * @example
 * <Sidebar collapsed={collapsed} onToggle={toggle} onExpand={expand} onCreateCompany={openSheet} />
 */
export function Sidebar({ collapsed: collapsedProp, mobile = false, onToggle, onExpand, onNavigate, onCreateCompany }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const ledgers = useLedgers();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const collapsed = collapsedProp && !mobile;
  const scope = mobile ? 'mobile' : 'desktop';

  const companies = (ledgers.data ?? []).filter(ledger => ledger.type === 'COMPANY');
  const [personalItem, companiesItem] = BOOKS_GROUP.children;
  const bookEntries: GroupEntry[] = [
    { item: personalItem },
    { item: companiesItem, exact: true },
    ...companies.map(company => ({
      item: { href: `/empresas/${company.ledgerId}`, label: company.name, icon: companiesItem.icon },
      leading: <span className='flex size-4 shrink-0 items-center justify-center rounded-xs bg-fill-3 text-micro font-bold text-fg'>{initials(company.name).slice(0, 1)}</span>,
    })),
  ];
  const registryEntries: GroupEntry[] = REGISTRY_GROUP.children.map(item => ({ item }));

  /**
   * Diz se o grupo está aberto: o que a pessoa escolheu, ou aberto quando a rota está nele.
   *
   * @param group - Grupo
   * @returns `true` quando o submenu aparece
   */
  function isOpen(group: NavGroup): boolean {
    return openGroups[group.id] ?? groupContains(pathname, group.children);
  }

  /**
   * Abre ou fecha um grupo. Com o menu recolhido, primeiro expande o menu
   * e abre o grupo, para os filhos ficarem visíveis.
   *
   * @param group - Grupo tocado
   */
  function toggleGroup(group: NavGroup) {
    if (collapsed) {
      onExpand();
      setOpenGroups(current => ({ ...current, [group.id]: true }));
      return;
    }
    setOpenGroups(current => ({ ...current, [group.id]: !isOpen(group) }));
  }

  return (
    <Tooltip.Provider delayDuration={120}>
      <div className='flex h-full min-h-0 flex-col select-none'>
        {mobile && (
          <div className='flex h-14 shrink-0 items-center justify-end pr-3'>
            <button
              type='button'
              onClick={onToggle}
              aria-label='Fechar menu'
              className='rounded-md p-1.5 text-fg-subtle transition-colors hover:text-fg focus-visible:ring-[3px] focus-visible:ring-focus-ring focus-visible:outline-none'
            >
              <X className='size-[18px]' strokeWidth={2} />
            </button>
          </div>
        )}

        <nav className={cn('no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-3', mobile ? 'pt-1' : 'pt-4')} aria-label='Menu principal'>
          <ul className='flex flex-col gap-0.5'>
            {PRIMARY_NAV.map(item => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(pathname, item.href)} collapsed={collapsed} scope={scope} onNavigate={onNavigate} />
              </li>
            ))}
            <NavGroupItem
              group={BOOKS_GROUP}
              entries={bookEntries}
              open={isOpen(BOOKS_GROUP)}
              collapsed={collapsed}
              scope={scope}
              pathname={pathname}
              onToggle={() => toggleGroup(BOOKS_GROUP)}
              onNavigate={onNavigate}
              footer={
                <button type='button' onClick={onCreateCompany} className={cn(ITEM_CLASS, IDLE_CLASS, 'h-9')}>
                  <Plus className='size-4 shrink-0' strokeWidth={2.4} />
                  <span className='truncate'>Nova empresa</span>
                </button>
              }
            />
            <NavGroupItem
              group={REGISTRY_GROUP}
              entries={registryEntries}
              open={isOpen(REGISTRY_GROUP)}
              collapsed={collapsed}
              scope={scope}
              pathname={pathname}
              onToggle={() => toggleGroup(REGISTRY_GROUP)}
              onNavigate={onNavigate}
            />
          </ul>
        </nav>

        <div className='shrink-0 border-t border-border px-3 py-3'>
          <NavLink item={SETTINGS_NAV} active={isActive(pathname, SETTINGS_NAV.href)} collapsed={collapsed} scope={scope} onNavigate={onNavigate} />
          <div className={cn('mt-2 flex items-center gap-2.5 px-1.5', collapsed && 'flex-col gap-1 px-0')}>
            <NavTooltip label={user?.name ?? 'Conta'} enabled={collapsed}>
              <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-inverted text-caption font-semibold text-inverted-fg'>{initials(user?.name ?? '?')}</span>
            </NavTooltip>
            {!collapsed && (
              <div className='min-w-0 flex-1'>
                <p className='truncate text-footnote font-semibold'>{user?.name}</p>
                <button type='button' onClick={() => void logout()} className='mt-0.5 text-caption font-medium text-error underline-offset-2 hover:underline'>
                  Sair
                </button>
              </div>
            )}
            {collapsed && (
              <button type='button' onClick={() => void logout()} className='text-caption-2 font-medium text-error underline-offset-2 hover:underline'>
                Sair
              </button>
            )}
          </div>
          {!collapsed && <p className='mt-3 px-1.5 text-micro tracking-wide text-fg-subtle'>{PRODUCT_NAME}</p>}
        </div>
      </div>
    </Tooltip.Provider>
  );
}
