/**
 * Alerta de confirmação no estilo do iOS (título, texto, dois botões).
 *
 * @module components/ui/ConfirmDialog
 */
'use client';

import { AnimatePresence, motion } from 'motion/react';
import { AlertDialog } from 'radix-ui';
import { Button } from './Button';

/** Propriedades do alerta. */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  loading?: boolean;
}

/**
 * Pede confirmação antes de uma ação irreversível.
 *
 * @example
 * <ConfirmDialog open={open} onOpenChange={setOpen} title='Apagar conta?' message='...' confirmLabel='Apagar' destructive onConfirm={remove} />
 */
export function ConfirmDialog({ open, onOpenChange, title, message, confirmLabel, onConfirm, destructive = false, loading = false }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <AlertDialog.Portal forceMount>
            <AlertDialog.Overlay asChild forceMount>
              <motion.div className='fixed inset-0 z-(--z-dialog) bg-overlay' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </AlertDialog.Overlay>
            <AlertDialog.Content forceMount className='fixed inset-0 z-(--z-dialog) flex items-center justify-center p-6 outline-none'>
              <motion.div
                className='material w-full max-w-[300px] overflow-hidden rounded-2xl bg-elevated/90 text-center shadow-float'
                initial={{ opacity: 0, scale: 1.12 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              >
                <div className='px-5 pt-5 pb-4'>
                  <AlertDialog.Title className='text-headline font-semibold'>{title}</AlertDialog.Title>
                  <AlertDialog.Description className='mt-1 text-footnote text-fg-muted'>{message}</AlertDialog.Description>
                </div>
                <div className='grid grid-cols-2 gap-2 border-t border-border p-3'>
                  <AlertDialog.Cancel asChild>
                    <Button variant='secondary' size='md' className='w-full'>
                      Cancelar
                    </Button>
                  </AlertDialog.Cancel>
                  <Button variant={destructive ? 'destructive' : 'primary'} size='md' className='w-full' loading={loading} onClick={onConfirm}>
                    {confirmLabel}
                  </Button>
                </div>
              </motion.div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        )}
      </AnimatePresence>
    </AlertDialog.Root>
  );
}
