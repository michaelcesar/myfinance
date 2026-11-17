/**
 * Contrato de resposta da API (envelope e paginação).
 *
 * @module types/api
 */

/** Corpo de sucesso: todo 2xx chega embrulhado. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/** Corpo de erro: `error` é sempre uma frase pronta para a tela. */
export interface ApiFailure {
  success: false;
  statusCode: number;
  error: string;
  details?: string[];
  timestamp: string;
  path: string;
}

/** Página do `nestjs-paginate`. */
export interface Paginated<T> {
  data: T[];
  meta: {
    itemsPerPage: number;
    totalItems: number;
    currentPage: number;
    totalPages: number;
  };
}
