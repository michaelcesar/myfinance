/**
 * Esqueleto de carregamento da rota `/entrar`.
 *
 * Só compõe o `SignInPageSkeleton` do formulário.
 *
 * @module app/entrar/loading
 */
import { SignInPageSkeleton } from './SignInForm';

/**
 * Fallback da rota enquanto o segmento carrega.
 *
 * @returns Tela de entrada em esqueleto
 */
export default function Loading() {
  return <SignInPageSkeleton />;
}
