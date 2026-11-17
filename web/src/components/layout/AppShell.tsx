/**
 * Moldura das telas autenticadas: guarda de sessão, menu lateral flutuante
 * (recolhível: clique numa área vazia dele alterna aberto/recolhido; `Esc` recolhe), barra superior e gaveta no celular,
 * período compartilhado e atalho de lançamento.
 *
 * @module components/layout/AppShell
 */
'use client';

import { useRouter } from 'next/navigation';
import { type MouseEvent, type ReactNode, Suspense, useEffect, useState, ViewTransition } from 'react';
import { LedgerSheet } from '@/components/finance/LedgerSheet';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/AuthProvider';
import { PeriodProvider } from '@/providers/PeriodProvider';
import { BrandMark } from './BrandMark';
import { MobileDrawer, MobileTopBar } from './MobileNav';
import { QuickAddProvider } from './QuickAddProvider';
import { Sidebar } from './Sidebar';

/** O que, dentro do menu, é item e não área vazia — clicar nisso não expande nem recolhe. */
const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, label, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';

/** Chave do `localStorage` com a preferência do menu (preferência visual, como o tema). */
export const SIDEBAR_STORAGE_KEY = 'financial-sidebar';

/**
 * Lê se o menu estava recolhido.
 *
 * @returns `true` quando a pessoa deixou o menu recolhido
 */
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

/**
 * Guarda a preferência do menu.
 *
 * @param collapsed - Menu recolhido
 */
function writeCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
  } catch {
    /** Sem armazenamento (aba privada): a preferência vale só nesta visita. */
  }
}

/**
 * Tela de abertura enquanto a sessão é restaurada.
 *
 * @returns Marca pulsando no centro
 */
function Splash() {
  return (
    <div className='flex min-h-dvh items-center justify-center'>
      <BrandMark className='animate-pulse text-display' />
    </div>
  );
}

/**
 * Moldura autenticada. Sem sessão, manda para `/entrar`. O esqueleto de cada
 * tela vem do `loading.tsx` da própria rota (o `Suspense` daqui não desenha
 * nada). O conteúdo fica num `<ViewTransition>` nomeado `page`: trocar de tela faz um crossfade
 * curto com leve subida (keyframes em `globals.css`).
 *
 * @param props - `children`
 * @returns Layout com navegação
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);

  useEffect(() => {
    if (status === 'anonymous') router.replace('/entrar');
  }, [router, status]);

  useEffect(() => {
    if (collapsed) return;
    /**
     * `Esc` recolhe o menu do desktop — a não ser que uma folha ou diálogo
     * esteja aberto (aí o `Esc` é dele) ou a tela seja estreita (gaveta).
     *
     * @param event - Tecla
     */
    function collapseOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      if (!window.matchMedia('(min-width: 1024px)').matches) return;
      setCollapsed(true);
      writeCollapsed(true);
    }
    window.addEventListener('keydown', collapseOnEscape);
    return () => window.removeEventListener('keydown', collapseOnEscape);
  }, [collapsed]);

  if (status !== 'authenticated') return <Splash />;

  /**
   * Recolhe ou expande o menu do desktop e guarda a escolha.
   *
   * @param next - Novo estado
   */
  function changeCollapsed(next: boolean) {
    setCollapsed(next);
    writeCollapsed(next);
  }

  /**
   * Clique no painel do menu: numa área vazia (fora de link, botão ou campo)
   * alterna — expande o menu recolhido e recolhe o aberto. Clique num item só
   * faz o que o item faz (navegar), sem mexer no menu.
   *
   * @param event - Clique dentro do painel
   */
  function toggleFromPanel(event: MouseEvent<HTMLElement>) {
    if ((event.target as Element).closest(INTERACTIVE_SELECTOR)) return;
    changeCollapsed(!collapsed);
  }

  return (
    <PeriodProvider>
      <QuickAddProvider>
        <aside
          onClick={toggleFromPanel}
          title={collapsed ? 'Clique numa área vazia para expandir' : undefined}
          className={cn(
            'material fixed top-shell bottom-shell left-shell z-(--z-nav) hidden overflow-hidden rounded-2xl border border-border bg-sidebar shadow-card transition-[width] duration-300 ease-apple lg:block',
            collapsed ? 'w-sidebar-rail cursor-pointer' : 'w-sidebar'
          )}
        >
          <Sidebar collapsed={collapsed} onToggle={() => changeCollapsed(!collapsed)} onExpand={() => changeCollapsed(false)} onCreateCompany={() => setCreatingCompany(true)} />
        </aside>

        <MobileTopBar onOpenMenu={() => setDrawerOpen(true)} />
        <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Sidebar
            collapsed={false}
            mobile
            onToggle={() => setDrawerOpen(false)}
            onExpand={() => setDrawerOpen(true)}
            onNavigate={() => setDrawerOpen(false)}
            onCreateCompany={() => {
              setDrawerOpen(false);
              setCreatingCompany(true);
            }}
          />
        </MobileDrawer>

        <main className={cn('min-h-dvh transition-[padding] duration-300 ease-apple', collapsed ? 'lg:pl-content-rail' : 'lg:pl-content')}>
          <div className='mx-auto w-full max-w-page p-gutter'>
            <Suspense fallback={null}>
              <ViewTransition name='page'>
                <div>{children}</div>
              </ViewTransition>
            </Suspense>
          </div>
        </main>

        <LedgerSheet open={creatingCompany} onOpenChange={setCreatingCompany} />
      </QuickAddProvider>
    </PeriodProvider>
  );
}
