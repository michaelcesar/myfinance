/**
 * Rota da previsão.
 *
 * @module app/(app)/previsao/page
 */
import type { Metadata } from 'next';
import { ForecastView } from './ForecastView';

export const metadata: Metadata = { title: 'Previsão' };

/** Tela autenticada, montada só no navegador — ver o `instant` de `app/(app)/layout.tsx`. */
export const instant = false;

/**
 * Página da previsão.
 *
 * @returns Tela de previsão
 */
export default function Page() {
  return <ForecastView />;
}
