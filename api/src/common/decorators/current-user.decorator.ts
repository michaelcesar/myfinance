/**
 * Injeta o usuário autenticado num parâmetro do controller.
 *
 * @module common/decorators/current-user.decorator
 */
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type Request } from 'express';
import { type AuthUser } from '~/common/types/auth-user.type';

/**
 * Lê `request.user`, preenchido pelo `AuthGuard` global.
 *
 * @example
 * @Get()
 * findAll(@CurrentUser() user: AuthUser) { ... }
 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  const request = context.switchToHttp().getRequest<Request & { user: AuthUser }>();
  return request.user;
});
