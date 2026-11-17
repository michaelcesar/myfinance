/**
 * Filtro global que padroniza toda resposta de erro.
 *
 * @module common/filters/http-exception.filter
 */
import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { type Request, type Response } from 'express';
import { QueryFailedError } from 'typeorm';

/** Corpo de erro devolvido pela API. */
export interface ErrorEnvelope {
  success: false;
  statusCode: number;
  error: string;
  details?: string[];
  timestamp: string;
  path: string;
}

/** Códigos do Postgres traduzidos em erro de cliente em vez de 500. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

/**
 * Converte qualquer exceção no envelope `{ success: false, ... }`.
 *
 * Erro não previsto vira 500 com mensagem genérica; o stack vai só para o
 * log, nunca para a resposta (`CONSTRAINTS.md` C03).
 *
 * @example
 * app.useGlobalFilters(new GlobalExceptionFilter());
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  /**
   * Escreve a resposta de erro.
   *
   * @param exception - Qualquer valor lançado
   * @param host - Contexto da requisição
   *
   * @example
   * filter.catch(new NotFoundException('Conta não encontrada.'), host);
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const { statusCode, error, details } = this.resolve(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${request.method} ${request.url} → ${statusCode}`, stack);
    }

    const body: ErrorEnvelope = {
      success: false,
      statusCode,
      error,
      ...(details && details.length > 1 ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    response.status(statusCode).json(body);
  }

  /**
   * Extrai status, mensagem principal e detalhes de validação.
   *
   * @param exception - Valor lançado
   * @returns Partes do envelope de erro
   */
  private resolve(exception: unknown): { statusCode: number; error: string; details?: string[] } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') return { statusCode, error: payload };
      const message = (payload as { message?: string | string[] }).message;
      if (Array.isArray(message)) return { statusCode, error: message[0] ?? exception.message, details: message };
      return { statusCode, error: message ?? exception.message };
    }

    if (exception instanceof QueryFailedError) {
      const code = (exception.driverError as { code?: string } | undefined)?.code;
      if (code === PG_UNIQUE_VIOLATION) return { statusCode: HttpStatus.CONFLICT, error: 'Já existe um registro com esses dados.' };
      if (code === PG_FOREIGN_KEY_VIOLATION) return { statusCode: HttpStatus.CONFLICT, error: 'O registro está em uso por outros dados.' };
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, error: 'Erro interno. Tente novamente em instantes.' };
  }
}
