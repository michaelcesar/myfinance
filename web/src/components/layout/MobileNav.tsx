/**
 * Navegação das telas estreitas (abaixo de `lg`): barra superior com o
 * botão de menu, o monograma "FM" e o atalho de lançamento, e a gaveta que desliza
 * da esquerda com o mesmo menu do desktop — o padrão do juscia no celular.
 *
 * @module components/layout/MobileNav
 */
'use client';

import { Menu, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { BrandMark } from './BrandMark';
import { useQuickAdd } from './QuickAddProvider';

const EASE = [0.32, 0.72, 0, 1] as const;

/**
 * Barra superior fixa do celular.
 *
 * @param props - Abre a gaveta
 * @returns Barra com menu, marca e "+"
 */
export function MobileTopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { open } = useQuickAdd();
  return (
    <header className='material sticky top-0 z-(--z-nav) flex h-topbar items-center justify-between gap-3 border-b border-border bg-topbar px-gutter lg:hidden'>
      <div className='flex min-w-0 items-center gap-2'>
        <IconButton label='Abrir menu' tone='plain' onClick={onOpenMenu} className='size-10 [&_svg]:size-[22px]'>
          <Menu strokeWidth={2} />
        </IconButton>
        <BrandMark className='text-title-3' />
      </div>
      <IconButton label='Novo lançamento' tone='primary' onClick={() => open()} className='size-10 [&_svg]:size-5'>
        <Plus strokeWidth={2.6} />
      </IconButton>
    </header>
  );
}

/** Propriedades da gaveta. */
export interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Gaveta do menu (Radix Dialog): prende o foco, fecha com `Esc`, com toque
 * fora e ao seguir um link.
 *
 * @example
 * <MobileDrawer open={open} onOpenChange={setOpen}><Sidebar mobile ... /></MobileDrawer>
 */
export function MobileDrawer({ open, onOpenChange, children }: MobileDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className='fixed inset-0 z-(--z-sheet) bg-overlay lg:hidden'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, ease: EASE }}
              />
            </Dialog.Overlay>
            <Dialog.Content forceMount asChild aria-describedby={undefined}>
              <motion.div
                className='fixed inset-y-0 left-0 z-(--z-sheet) flex w-sidebar max-w-[85vw] flex-col border-r border-border bg-surface shadow-float outline-none lg:hidden'
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%', transition: { duration: 0.22, ease: EASE } }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <Dialog.Title className='sr-only'>Menu</Dialog.Title>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
