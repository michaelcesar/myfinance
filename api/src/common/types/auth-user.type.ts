/**
 * Identidade autenticada anexada à requisição pelo `AuthGuard`.
 *
 * @module common/types/auth-user.type
 */

/** Dados lidos do JWT de acesso — não é a entidade `User` completa. */
export interface AuthUser {
  userId: string;
  email: string;
}

/** Conteúdo assinado no JWT de acesso. */
export interface JwtPayload {
  userId: string;
  email: string;
}
