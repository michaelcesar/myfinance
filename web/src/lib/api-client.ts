/**
 * Cliente HTTP da API.
 *
 * Toda chamada passa por `/api/*` (reescrito pelo Next para a API), leva o
 * access token em memória e chega já desembrulhada do envelope
 * `{ success, data }`. Um 401 dispara uma única renovação compartilhada e a
 * requisição é refeita; se a renovação falhar, a sessão acaba.
 *
 * @module lib/api-client
 */
import type { ApiFailure, ApiSuccess } from '@/types/api';
import type { User } from '@/types/entities';
import { getAccessToken, setAccessToken } from './session';

/** Erro de API com status e mensagem já pronta para a tela. */
export class ApiError extends Error {
  /**
   * @param status - Status HTTP (0 quando a rede falhou)
   * @param message - Frase vinda da API, ou uma genérica
   * @param details - Mensagens de validação por campo, quando houver
   */
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = []
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Sessão devolvida por login, cadastro e renovação. */
export interface SessionPayload {
  accessToken: string;
  user: User;
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Sem renovar em 401 (as próprias rotas de sessão). */
  skipRefresh?: boolean;
}

let refreshing: Promise<SessionPayload> | null = null;
let onSessionExpired: (() => void) | null = null;

/**
 * Registra quem reage ao fim da sessão (o `AuthProvider`, que manda para o login).
 *
 * @param handler - Função chamada quando a renovação falha
 */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

/**
 * Monta a query string, descartando valores vazios.
 *
 * @param query - Parâmetros
 * @returns `?a=1&b=2` ou string vazia
 *
 * @example
 * buildQuery({ 'filter.kind': '$eq:INCOME', limit: 50 }); // '?filter.kind=%24eq%3AINCOME&limit=50'
 */
export function buildQuery(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

/**
 * Renova a sessão pelo cookie. Chamadas simultâneas compartilham a mesma
 * promessa: dez requisições com 401 geram um único `POST /auth/refresh`.
 *
 * @returns Sessão nova
 * @throws `ApiError` se o refresh token não valer mais
 */
export function refreshSession(): Promise<SessionPayload> {
  refreshing ??= request<SessionPayload>('/auth/refresh', { method: 'POST', skipRefresh: true })
    .then(session => {
      setAccessToken(session.accessToken);
      return session;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Executa uma requisição à API.
 *
 * @param path - Caminho da API, começando com `/`
 * @param options - Método, corpo e query
 * @returns O `data` do envelope
 * @throws `ApiError` com a mensagem da API
 *
 * @example
 * const ledgers = await request<Paginated<Ledger>>('/ledgers');
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, skipRefresh = false } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`/api${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet.');
  }

  if (response.status === 401 && !skipRefresh) {
    try {
      await refreshSession();
    } catch {
      setAccessToken(null);
      onSessionExpired?.();
      throw new ApiError(401, 'Sua sessão expirou. Entre novamente.');
    }
    return request<T>(path, { ...options, skipRefresh: true });
  }

  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;
  if (!response.ok || !payload || payload.success !== true) {
    const failure = payload && payload.success === false ? payload : null;
    throw new ApiError(response.status, failure?.error ?? 'Algo deu errado. Tente novamente.', failure?.details);
  }
  return payload.data;
}
