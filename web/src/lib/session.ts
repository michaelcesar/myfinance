/**
 * Guarda do access token em memória.
 *
 * O token nunca vai para `localStorage` nem cookie legível: vive só nesta
 * variável de módulo e some ao recarregar a página. A sessão é restaurada
 * pelo refresh token, que fica num cookie `httpOnly` que o JavaScript não
 * enxerga (`ADR-003` da API).
 *
 * @module lib/session
 */

let accessToken: string | null = null;

/**
 * Lê o access token atual.
 *
 * @returns Token, ou `null` sem sessão
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Troca o access token (ou limpa, com `null`).
 *
 * @param token - Token novo
 */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}
