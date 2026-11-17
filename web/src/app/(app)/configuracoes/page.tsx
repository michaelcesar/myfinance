/**
 * Rota de configurações.
 *
 * @module app/(app)/configuracoes/page
 */
import type { Metadata } from 'next';
import { SettingsView } from './SettingsView';

export const metadata: Metadata = { title: 'Configurações' };

/** Tela autenticada, montada só no navegador — ver o `instant` de `app/(app)/layout.tsx`. */
export const instant = false;

/**
 * Página de configurações.
 *
 * @returns Tela de configurações
 */
export default function Page() {
  return <SettingsView />;
}
