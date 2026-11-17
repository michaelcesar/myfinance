/**
 * Guard global de autenticação por JWT de acesso.
 *
 * @module common/guards/auth.guard
 */
import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type Request } from 'express';
import { IS_PUBLIC_KEY } from '~/common/decorators/public.decorator';
import { type AuthUser, type JwtPayload } from '~/common/types/auth-user.type';

/**
 * Exige `Authorization: Bearer <jwt>` em toda rota que não tenha `@Public()`.
 *
 * Registrado como `APP_GUARD`: a rota nasce protegida e abrir exceção é
 * explícito, o contrário do padrão do Nest (`ADR-004`).
 *
 * @example
 * providers: [{ provide: APP_GUARD, useClass: AuthGuard }]
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector
  ) {}

  /**
   * Valida o token e anexa `request.user`.
   *
   * @param context - Contexto da requisição
   * @returns `true` quando a rota é pública ou o token é válido
   * @throws `UnauthorizedException` sem token ou com token inválido/expirado
   *
   * @example
   * await guard.canActivate(context);
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Sessão ausente.');

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      request.user = { userId: payload.userId, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Sessão expirada.');
    }
  }
}
