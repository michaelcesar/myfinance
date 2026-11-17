/**
 * Interceptor global que embrulha toda resposta de sucesso.
 *
 * @module common/interceptors/transform.interceptor
 */
import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';

/** Corpo de sucesso devolvido pela API. */
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

/**
 * Transforma o retorno do handler em `{ success: true, data }`. Retorno
 * `undefined` (um `DELETE`, por exemplo) vira `data: null`.
 *
 * @example
 * app.useGlobalInterceptors(new TransformInterceptor());
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T | null>> {
  /**
   * Aplica o envelope ao fluxo de resposta.
   *
   * @param _context - Contexto da requisição (não usado)
   * @param next - Próximo handler
   * @returns Fluxo com o corpo embrulhado
   *
   * @example
   * interceptor.intercept(context, { handle: () => of({ ok: 1 }) });
   */
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T | null>> {
    return next.handle().pipe(map(data => ({ success: true as const, data: data ?? null })));
  }
}
