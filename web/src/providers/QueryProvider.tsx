/**
 * Cache de dados do servidor (TanStack Query).
 *
 * Todo erro de mutação vira aviso automaticamente, com a mensagem da API.
 * Leituras não geram aviso: erro de leitura é estado da seção na tela.
 *
 * @module providers/QueryProvider
 */
'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { useToast } from './ToastProvider';

/**
 * Provedor do TanStack Query, com um cliente por montagem no navegador.
 *
 * @param props - `children`
 * @returns Conteúdo com o cache de dados
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 2,
          },
        },
        mutationCache: new MutationCache({
          onError: error => {
            if (error instanceof ApiError && error.status === 401) return;
            notify(error instanceof Error ? error.message : 'Algo deu errado.', 'error');
          },
        }),
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
