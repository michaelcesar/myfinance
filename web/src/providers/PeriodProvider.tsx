/**
 * Período de análise compartilhado entre as telas.
 *
 * Trocar de "Novembro" para "Outubro" na visão geral mantém outubro ao abrir
 * uma empresa: o período é do usuário, não de cada tela.
 *
 * @module providers/PeriodProvider
 */
'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { formatMonthLong, toIsoDate } from '@/lib/format';

/** Granularidade do período. */
export type PeriodMode = 'month' | 'year';

interface PeriodContextValue {
  mode: PeriodMode;
  /** Âncora do período: o mês (`YYYY-MM`) ou o ano, no modo anual. */
  anchor: string;
  from: string;
  to: string;
  label: string;
  isCurrent: boolean;
  setMode: (mode: PeriodMode) => void;
  shift: (delta: number) => void;
  reset: () => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

/**
 * Mês atual como `YYYY-MM`.
 *
 * @returns Mês corrente
 */
function currentMonth(): string {
  return toIsoDate(new Date()).slice(0, 7);
}

/**
 * Provedor do período.
 *
 * @param props - `children`
 * @returns Conteúdo com o contexto de período
 */
export function PeriodProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PeriodMode>('month');
  const [anchor, setAnchor] = useState<string>(currentMonth);

  const shift = useCallback(
    (delta: number) => {
      setAnchor(current => {
        const [year, month] = current.split('-').map(Number);
        const date = mode === 'month' ? new Date(year, month - 1 + delta, 1) : new Date(year + delta, month - 1, 1);
        return toIsoDate(date).slice(0, 7);
      });
    },
    [mode]
  );

  const value = useMemo<PeriodContextValue>(() => {
    const [year, month] = anchor.split('-').map(Number);
    const from = mode === 'month' ? `${anchor}-01` : `${year}-01-01`;
    const to = mode === 'month' ? toIsoDate(new Date(year, month, 0)) : `${year}-12-31`;
    const now = currentMonth();
    return {
      mode,
      anchor,
      from,
      to,
      label: mode === 'month' ? formatMonthLong(anchor) : String(year),
      isCurrent: mode === 'month' ? anchor === now : String(year) === now.slice(0, 4),
      setMode: setModeState,
      shift,
      reset: () => setAnchor(currentMonth()),
    };
  }, [anchor, mode, shift]);

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

/**
 * Acessa o período.
 *
 * @returns Período e ações de navegação
 * @throws `Error` fora do `PeriodProvider`
 */
export function usePeriod(): PeriodContextValue {
  const context = useContext(PeriodContext);
  if (!context) throw new Error('usePeriod precisa estar dentro de <PeriodProvider>.');
  return context;
}
