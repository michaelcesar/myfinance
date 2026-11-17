/**
 * Folha modal: sobe de baixo no celular e surge no centro no desktop,
 * com o fundo escurecendo — o "sheet" do iOS.
 *
 * @module components/ui/Sheet
 */
'use client';

import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

/** Propriedades da folha. */
export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

/** Curva de animação das folhas do iOS. */
export const SHEET_EASE = [0.32, 0.72, 0, 1] as const;

/**
 * Folha modal acessível (Radix Dialog) com animação de entrada e saída.
 * O foco fica preso dentro dela, `Esc` fecha e um clique fora também.
 *
 * O `Dialog.Content` é um contêiner flex de tela cheia que só posiciona;
 * o painel animado vai dentro dele. Assim o transform do Motion não briga
 * com o `translate` de centralização.
 *
 * @example
 * <Sheet open={open} onOpenChange={setOpen} title='Nova conta' footer={<Button>Salvar</Button>}>...</Sheet>
 */
export function Sheet({ open, onOpenChange, title, description, children, footer, size = 'md' }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className='fixed inset-0 z-(--z-sheet) bg-overlay'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, ease: SHEET_EASE }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              forceMount
              className='fixed inset-0 z-(--z-sheet) flex items-end justify-center outline-none md:items-center md:p-6'
              onClick={event => {
                if (event.target === event.currentTarget) onOpenChange(false);
              }}
            >
              <motion.div
                className={cn('flex max-h-[92dvh] w-full flex-col rounded-t-sheet bg-elevated shadow-float md:max-h-[86dvh] md:rounded-sheet', size === 'lg' ? 'md:max-w-[640px]' : 'md:max-w-[520px]')}
                initial={{ opacity: 0, y: 48, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 32, scale: 0.98, transition: { duration: 0.2, ease: SHEET_EASE } }}
                transition={{ duration: 0.45, ease: SHEET_EASE }}
              >
                <div className='mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-fill-3 md:hidden' aria-hidden />
                <header className='flex shrink-0 items-start justify-between gap-4 px-6 pt-4 pb-3 md:pt-6'>
                  <div className='min-w-0'>
                    <Dialog.Title className='font-display text-title-2 font-bold tracking-[-0.02em]'>{title}</Dialog.Title>
                    <Dialog.Description className={description ? 'mt-0.5 text-subhead text-fg-muted' : 'sr-only'}>{description ?? title}</Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <IconButton label='Fechar'>
                      <X strokeWidth={2.5} />
                    </IconButton>
                  </Dialog.Close>
                </header>
                <div className='flex-1 overflow-y-auto px-6 pt-1 pb-5'>{children}</div>
                {footer && <footer className='flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]'>{footer}</footer>}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
