/**
 * Hooks de leitura e escrita dos dados financeiros (TanStack Query).
 *
 * Toda chave começa com `'finance'`. Uma escrita mexe em saldo, painel e
 * listas ao mesmo tempo — um lançamento muda a conta, o resumo do livro e a
 * visão geral —, então toda mutação invalida a árvore `'finance'` inteira.
 * Mais simples e mais correto que mapear dependências à mão.
 *
 * @module hooks/useFinance
 */
'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/providers/ToastProvider';
import {
  type ForecastQuery,
  accountsService,
  categoriesService,
  dashboardService,
  investmentsService,
  ledgersService,
  recurrencesService,
  type PeriodInput,
  transactionsService,
} from '@/services/finance.service';

type Query = Record<string, string | number | boolean | undefined | null>;

/** Raiz de todas as chaves financeiras. */
export const FINANCE_KEY = 'finance';

/**
 * Livros do usuário (pessoal primeiro), sem os arquivados por padrão.
 *
 * @param includeArchived - Inclui empresas arquivadas
 * @returns Query com a lista de livros
 */
export function useLedgers(includeArchived = false) {
  return useQuery({
    queryKey: [FINANCE_KEY, 'ledgers', includeArchived],
    queryFn: async () => (await ledgersService.list(includeArchived ? {} : { 'filter.archived': '$eq:false' })).data,
  });
}

/**
 * Um livro.
 *
 * @param ledgerId - Id do livro
 * @returns Query com o livro
 */
export function useLedger(ledgerId: string | undefined) {
  return useQuery({
    queryKey: [FINANCE_KEY, 'ledger', ledgerId],
    queryFn: () => ledgersService.get(ledgerId!),
    enabled: !!ledgerId,
  });
}

/**
 * Contas com saldo, opcionalmente de um livro.
 *
 * @param ledgerId - Restringe a um livro
 * @param includeArchived - Inclui contas arquivadas
 * @returns Query com as contas
 */
export function useAccounts(ledgerId?: string, includeArchived = false) {
  return useQuery({
    queryKey: [FINANCE_KEY, 'accounts', ledgerId ?? 'all', includeArchived],
    queryFn: async () =>
      (
        await accountsService.list({
          ...(ledgerId ? { 'filter.ledgerId': `$eq:${ledgerId}` } : {}),
          ...(includeArchived ? {} : { 'filter.archived': '$eq:false' }),
        })
      ).data,
  });
}

/**
 * Categorias ativas.
 *
 * @returns Query com as categorias
 */
export function useCategories() {
  return useQuery({
    queryKey: [FINANCE_KEY, 'categories'],
    queryFn: async () => (await categoriesService.list()).data,
    staleTime: 5 * 60_000,
  });
}

/**
 * Recorrentes (contratos e contas fixas), com filtros opcionais.
 *
 * @param filters - Filtros no formato do `nestjs-paginate`
 * @returns Query com os recorrentes
 */
export function useRecurrences(filters: Query = {}) {
  return useQuery({
    queryKey: [FINANCE_KEY, 'recurrences', filters],
    queryFn: async () => (await recurrencesService.list(filters)).data,
  });
}

/**
 * Página de lançamentos.
 *
 * @param query - Página, busca e filtros
 * @returns Query com a página (mantém a anterior enquanto carrega a próxima)
 */
export function useTransactions(query: Query) {
  return useQuery({
    queryKey: [FINANCE_KEY, 'transactions', query],
    queryFn: () => transactionsService.list(query),
    placeholderData: keepPreviousData,
  });
}

/**
 * Investimentos com números derivados.
 *
 * @param ledgerId - Restringe a um livro
 * @returns Query com os investimentos
 */
export function useInvestments(ledgerId?: string) {
  return useQuery({
    queryKey: [FINANCE_KEY, 'investments', ledgerId ?? 'all'],
    queryFn: async () => (await investmentsService.list({ 'filter.archived': '$eq:false', ...(ledgerId ? { 'filter.ledgerId': `$eq:${ledgerId}` } : {}) })).data,
  });
}

/**
 * Movimentações de um investimento.
 *
 * @param investmentId - Id do investimento
 * @returns Query com as movimentações
 */
export function useInvestmentMovements(investmentId: string | undefined) {
  return useQuery({
    queryKey: [FINANCE_KEY, 'movements', investmentId],
    queryFn: async () => (await investmentsService.movements(investmentId!)).data,
    enabled: !!investmentId,
  });
}

/**
 * Visão geral consolidada do período.
 *
 * @param period - Intervalo de datas
 * @returns Query com a visão geral
 */
export function useOverview(period: PeriodInput) {
  return useQuery({
    queryKey: [FINANCE_KEY, 'overview', period],
    queryFn: () => dashboardService.overview(period),
    placeholderData: keepPreviousData,
  });
}

/**
 * Análise do realizado no período, contra o período anterior.
 *
 * @param query - Meses e livro
 * @returns Query com a análise (mantém a anterior enquanto troca o filtro)
 */
export function useAnalysis(query: ForecastQuery) {
  return useQuery({
    queryKey: [FINANCE_KEY, 'analysis', query],
    queryFn: () => dashboardService.analysis(query),
    placeholderData: keepPreviousData,
  });
}

/**
 * Previsão do período (realizado + pendentes + projeção dos recorrentes).
 *
 * @param query - Meses e livro
 * @returns Query com a previsão (mantém a anterior enquanto troca o filtro)
 */
export function useForecast(query: ForecastQuery) {
  return useQuery({
    queryKey: [FINANCE_KEY, 'forecast', query],
    queryFn: () => dashboardService.forecast(query),
    placeholderData: keepPreviousData,
  });
}

/**
 * Resumo de um livro no período.
 *
 * @param ledgerId - Id do livro
 * @param period - Intervalo de datas
 * @returns Query com o resumo
 */
export function useLedgerSummary(ledgerId: string | undefined, period: PeriodInput) {
  return useQuery({
    queryKey: [FINANCE_KEY, 'summary', ledgerId, period],
    queryFn: () => dashboardService.ledger(ledgerId!, period),
    enabled: !!ledgerId,
    placeholderData: keepPreviousData,
  });
}

/**
 * Mutação financeira padrão: executa, invalida a árvore `'finance'` e
 * mostra o aviso de sucesso. O aviso de erro vem do `QueryProvider`.
 *
 * @param mutationFn - Chamada ao serviço
 * @param successMessage - Frase do aviso de sucesso
 * @returns Mutação do TanStack Query
 *
 * @example
 * const save = useFinanceMutation((input: AccountInput) => accountsService.create(input), 'Conta criada.');
 */
export function useFinanceMutation<TInput, TOutput>(mutationFn: (input: TInput) => Promise<TOutput>, successMessage?: string) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [FINANCE_KEY] });
      if (successMessage) notify(successMessage);
    },
  });
}
