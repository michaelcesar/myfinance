/**
 * Atalho global de "novo lançamento", acessível de qualquer tela.
 *
 * @module components/layout/QuickAddProvider
 */
'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { TransactionSheet, type TransactionSheetDefaults } from '@/components/finance/TransactionSheet';

interface QuickAddContextValue {
  /** Abre a folha de lançamento, opcionalmente já num livro ou tipo. */
  open: (defaults?: TransactionSheetDefaults) => void;
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

/**
 * Mantém uma única folha de lançamento montada para o app todo.
 *
 * @param props - `children`
 * @returns Conteúdo com o atalho disponível
 */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; defaults?: TransactionSheetDefaults }>({ open: false });
  const open = useCallback((defaults?: TransactionSheetDefaults) => setState({ open: true, defaults }), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <TransactionSheet open={state.open} onOpenChange={next => setState(current => ({ ...current, open: next }))} defaults={state.defaults} />
    </QuickAddContext.Provider>
  );
}

/**
 * Acessa o atalho de lançamento.
 *
 * @returns `{ open }`
 * @throws `Error` fora do `QuickAddProvider`
 */
export function useQuickAdd(): QuickAddContextValue {
  const context = useContext(QuickAddContext);
  if (!context) throw new Error('useQuickAdd precisa estar dentro de <QuickAddProvider>.');
  return context;
}
