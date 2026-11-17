/**
 * Esqueleto de carregamento da rota `/configuracoes`.
 *
 * Só compõe o `SettingsPageSkeleton` da tela — o mesmo que a tela mostra
 * enquanto os dados carregam.
 *
 * @module app/(app)/configuracoes/loading
 */
import { SettingsPageSkeleton } from './SettingsView';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Página de configurações em esqueleto
 */
export default function Loading() {
  return <SettingsPageSkeleton />;
}
