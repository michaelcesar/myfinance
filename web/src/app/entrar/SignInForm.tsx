/**
 * Formulário de login/cadastro com troca animada entre os dois modos.
 *
 * @module app/entrar/SignInForm
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BRAND_MARK_CLASS, BrandMark } from '@/components/layout/BrandMark';
import { Button } from '@/components/ui/Button';
import { CONTROL_SHAPE_CLASS } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { ButtonSkeleton, SkeletonText } from '@/components/ui/SkeletonKit';
import { TextInput } from '@/components/ui/Field';
import { useAppForm } from '@/hooks/useAppForm';
import { ApiError } from '@/lib/api-client';
import { textField } from '@/lib/form';
import { useAuth } from '@/providers/AuthProvider';
import { signInSchema, type SignUpFormValues, signUpSchema } from '@/schemas/auth.schema';
import { authService } from '@/services/auth.service';

type Mode = 'login' | 'register';

/** Página de entrada: o cartão centralizado na tela — a página e o esqueleto usam a mesma. */
export const SIGN_IN_MAIN_CLASS = 'relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12';

/** Cartão translúcido do formulário. */
const CARD_CLASS = 'material relative w-full max-w-[400px] rounded-3xl bg-surface/80 p-8 shadow-float sm:p-10';

/** Tamanho do monograma no topo do cartão. */
const SIGN_IN_MARK_CLASS = 'text-display';

/** Título do cartão. */
const TITLE_CLASS = 'mt-6 font-display text-display-sm font-bold tracking-[-0.025em]';

/** Frase abaixo do título. */
const SUBTITLE_CLASS = 'mt-1.5 text-body text-fg-muted';

/** Pilha de campos e botão. */
const FORM_CLASS = 'mt-8 flex flex-col gap-3';

/** Textos fixos de cada modo. */
const COPY = {
  login: { title: 'Entrar', subtitle: 'Suas finanças pessoais e das suas empresas.', submit: 'Continuar' },
  register: { title: 'Criar sua conta', subtitle: 'Pessoal e empresas, organizados num lugar só.', submit: 'Criar conta' },
} as const;

/**
 * Esqueleto da tela de entrada: o mesmo cartão, com a marca, o título, os
 * dois campos e o botão do modo de login.
 *
 * @returns Página de entrada em esqueleto
 *
 * @example
 * export default function Loading() { return <SignInPageSkeleton />; }
 */
export function SignInPageSkeleton() {
  return (
    <main className={SIGN_IN_MAIN_CLASS}>
      <div className={CARD_CLASS} aria-hidden>
        <div className='flex flex-col items-center text-center'>
          <SkeletonText className={`${BRAND_MARK_CLASS} ${SIGN_IN_MARK_CLASS} w-auto`} text='FM' align='center' />
          <SkeletonText className={TITLE_CLASS} text={COPY.login.title} align='center' />
          <SkeletonText className={SUBTITLE_CLASS} text={COPY.login.subtitle} align='center' />
        </div>
        <div className={FORM_CLASS}>
          <Skeleton className={`w-full ${CONTROL_SHAPE_CLASS}`} />
          <Skeleton className={`w-full ${CONTROL_SHAPE_CLASS}`} />
          <ButtonSkeleton size='lg' label={COPY.login.submit} icon fullWidth className='mt-2' />
        </div>
      </div>
    </main>
  );
}

/**
 * Cartão de entrada. Já logado, segue para a visão geral.
 *
 * @returns Formulário
 */
export function SignInForm() {
  const router = useRouter();
  const { status, login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState<string | null>(null);

  const signup = useQuery({ queryKey: ['signup-status'], queryFn: authService.signupStatus, staleTime: Infinity });
  const signupOpen = signup.data?.signupOpen ?? false;

  useEffect(() => {
    if (status === 'authenticated') router.replace('/visao-geral');
  }, [router, status]);

  const isRegister = mode === 'register';
  const form = useAppForm<SignUpFormValues>({
    initialValues: { name: '', email: '', password: '' },
    schema: isRegister ? signUpSchema : signInSchema,
    onSubmit: async values => {
      setError(null);
      try {
        if (isRegister) await register({ name: values.name, email: values.email, password: values.password });
        else await login({ email: values.email, password: values.password });
        router.replace('/visao-geral');
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'Não foi possível entrar agora.');
      }
    },
  });
  const submitting = form.isSubmitting;

  /**
   * Alterna entre login e cadastro, mantendo o que foi digitado e limpando os erros.
   */
  function toggleMode() {
    setError(null);
    form.resetForm({ values: form.values });
    setMode(isRegister ? 'login' : 'register');
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }} className={CARD_CLASS}>
      <div className='flex flex-col items-center text-center'>
        <BrandMark className={SIGN_IN_MARK_CLASS} />
        <AnimatePresence mode='wait' initial={false}>
          <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            <h1 className={TITLE_CLASS}>{COPY[mode].title}</h1>
            <p className={SUBTITLE_CLASS}>{COPY[mode].subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <form onSubmit={form.submit} noValidate className={FORM_CLASS}>
        <AnimatePresence initial={false}>
          {isRegister && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
              <TextInput placeholder='Nome' aria-label='Nome' autoComplete='name' {...textField(form, 'name')} maxLength={120} />
            </motion.div>
          )}
        </AnimatePresence>
        <TextInput placeholder='E-mail' aria-label='E-mail' type='email' autoComplete='email' {...textField(form, 'email')} />
        <TextInput placeholder='Senha' aria-label='Senha' type='password' autoComplete={isRegister ? 'new-password' : 'current-password'} {...textField(form, 'password')} />

        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className='px-1 text-center text-footnote text-error' role='alert'>
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <Button type='submit' size='lg' className='mt-2 w-full' loading={submitting} icon={submitting ? undefined : <ArrowRight className='size-5' />}>
          {COPY[mode].submit}
        </Button>
      </form>

      {signupOpen && (
        <p className='mt-6 text-center text-subhead text-fg-muted'>
          {isRegister ? 'Já tem conta?' : 'Primeira vez aqui?'}{' '}
          <button type='button' className='font-semibold text-fg underline-offset-4 hover:underline' onClick={toggleMode}>
            {isRegister ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      )}
    </motion.div>
  );
}
