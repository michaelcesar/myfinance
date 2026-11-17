/**
 * Avisos flutuantes no topo da tela, no estilo das notificações do iOS.
 *
 * @module providers/ToastProvider
 */
'use client';

import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';

/** Tom do aviso. */
export type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  /** Mostra um aviso; some sozinho em 3,5 s. Mensagem repetida em 2 s é ignorada. */
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;
const ICON_COLORS = { success: 'text-success', error: 'text-error', info: 'text-fg-muted' } as const;

/**
 * Provedor dos avisos. Fica no layout raiz, acima de tudo.
 *
 * @param props - `children`
 * @returns Conteúdo com a pilha de avisos sobreposta
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const lastShown = useRef<{ message: string; at: number } | null>(null);
  const counter = useRef(0);

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const now = Date.now();
    if (lastShown.current && lastShown.current.message === message && now - lastShown.current.at < 2000) return;
    lastShown.current = { message, at: now };
    const id = ++counter.current;
    setItems(current => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setItems(current => current.filter(item => item.id !== id)), 3500);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className='pointer-events-none fixed inset-x-0 top-3 z-(--z-toast) flex flex-col items-center gap-2 px-4' aria-live='polite' role='status'>
        <AnimatePresence initial={false}>
          {items.map(item => {
            const Icon = ICONS[item.tone];
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.96, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className='material pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full bg-elevated/85 px-4 py-2.5 text-subhead font-medium shadow-float'
              >
                <Icon className={`size-[18px] shrink-0 ${ICON_COLORS[item.tone]}`} strokeWidth={2.2} />
                <span>{item.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Acessa os avisos.
 *
 * @returns `{ notify }`
 * @throws `Error` fora do `ToastProvider`
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return context;
}
