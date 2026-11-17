/**
 * Tela de entrada: login e, quando permitido, criação de conta.
 *
 * @module app/entrar/page
 */
import type { Metadata } from 'next';
import { SIGN_IN_MAIN_CLASS, SignInForm } from './SignInForm';

export const metadata: Metadata = { title: 'Entrar' };

/**
 * Página pública de entrada.
 *
 * @returns Formulário de entrada centralizado
 */
export default function SignInPage() {
  return (
    <main className={SIGN_IN_MAIN_CLASS}>
      <SignInForm />
    </main>
  );
}
