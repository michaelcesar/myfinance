/**
 * Tema claro/escuro, seguindo o sistema por padrão.
 *
 * O script de `THEME_INIT_SCRIPT` roda no `<head>` antes da pintura e já
 * aplica `data-theme` no `<html>`: a página nunca pisca no tema errado.
 * Este provedor só mantém a escolha sincronizada depois disso.
 *
 * @module providers/ThemeProvider
 */
'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/** Preferência do usuário. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** Chave do `localStorage` (preferência visual, não dado sensível). */
export const THEME_STORAGE_KEY = 'financial-theme';

/**
 * Script de bloqueio do `<head>`: lê a preferência e aplica o tema antes do
 * primeiro paint.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}')||'light';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Lê a preferência salva.
 *
 * @returns Preferência, ou `light` (padrão: fundo branco)
 */
function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'system' || stored === 'dark' ? stored : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Aplica o tema resolvido no `<html>`.
 *
 * @param preference - Preferência atual
 */
function applyTheme(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

/**
 * Provedor do tema.
 *
 * @param props - `children`
 * @returns Conteúdo com o contexto de tema
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => (typeof window === 'undefined' ? 'system' : readPreference()));

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(readPreference());
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /** Armazenamento indisponível (aba privada): o tema vale só nesta visita. */
    }
    applyTheme(next);
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Acessa o tema.
 *
 * @returns Preferência e setter
 * @throws `Error` fora do `ThemeProvider`
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme precisa estar dentro de <ThemeProvider>.');
  return context;
}
