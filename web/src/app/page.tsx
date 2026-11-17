/**
 * Raiz do site: leva para a visão geral.
 *
 * @module app/page
 */
import { redirect } from 'next/navigation';

/**
 * Redireciona `/` para `/visao-geral`.
 *
 * @returns Nunca retorna
 */
export default function Home() {
  redirect('/visao-geral');
}
