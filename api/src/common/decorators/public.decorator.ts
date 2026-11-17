/**
 * Marca uma rota como pública, fora do `AuthGuard` global.
 *
 * @module common/decorators/public.decorator
 */
import { SetMetadata } from '@nestjs/common';

/** Chave de metadado lida pelo `AuthGuard`. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Libera a rota sem token. Toda rota pública precisa de JSDoc dizendo por
 * que não pode ter autenticação (`CONSTRAINTS.md` C05).
 *
 * @example
 * @Public()
 * @Post('login')
 * login() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
