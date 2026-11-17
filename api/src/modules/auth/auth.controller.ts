/**
 * Rotas de autenticação.
 *
 * @module modules/auth/auth.controller
 */
import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type CookieOptions, type Request, type Response } from 'express';
import { CurrentUser, Public } from '~/common/decorators';
import { type AuthUser } from '~/common/types/auth-user.type';
import { type Env } from '~/config/env.validation';
import { type User } from '~/modules/users/entities/user.entity';
import { UsersService } from '~/modules/users/users.service';
import { AuthService, type IssuedSession } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/** Nome do cookie do refresh token. */
export const REFRESH_COOKIE = 'financial_rt';

/** Corpo devolvido ao abrir ou renovar a sessão. */
export interface SessionResponse {
  accessToken: string;
  user: User;
}

/** Limite de tentativas nas rotas de credencial: 10 por minuto por IP. */
const CREDENTIAL_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

/**
 * Cadastro, login, renovação, logout, sessão atual e troca de senha.
 *
 * @example
 * POST /auth/login { "email": "ana@exemplo.com", "password": "12345678" }
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService<Env, true>
  ) {}

  /**
   * PUBLIC ENDPOINT — intentionally unauthenticated.
   * Motivo: a tela de login decide entre "Entrar" e "Criar conta" antes de existir sessão.
   *
   * @returns `{ signupOpen }`
   *
   * @example
   * GET /auth/signup-status
   */
  @Public()
  @Get('signup-status')
  async signupStatus(): Promise<{ signupOpen: boolean }> {
    return { signupOpen: await this.authService.isSignupOpen() };
  }

  /**
   * PUBLIC ENDPOINT — intentionally unauthenticated.
   * Motivo: cria a conta, portanto ainda não há sessão.
   *
   * @param dto - Nome, e-mail e senha
   * @param res - Resposta, para gravar o cookie
   * @returns Access token e usuário
   *
   * @example
   * POST /auth/register { "name": "Ana", "email": "ana@exemplo.com", "password": "12345678" }
   */
  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    return this.respondWithSession(await this.authService.register(dto), res);
  }

  /**
   * PUBLIC ENDPOINT — intentionally unauthenticated.
   * Motivo: é a rota que abre a sessão.
   *
   * @param dto - E-mail e senha
   * @param res - Resposta, para gravar o cookie
   * @returns Access token e usuário
   *
   * @example
   * POST /auth/login { "email": "ana@exemplo.com", "password": "12345678" }
   */
  @Public()
  @Throttle(CREDENTIAL_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    return this.respondWithSession(await this.authService.login(dto), res);
  }

  /**
   * PUBLIC ENDPOINT — intentionally unauthenticated.
   * Motivo: chamada justamente quando o access token expirou; a prova é o cookie.
   *
   * @param req - Requisição, para ler o cookie
   * @param res - Resposta, para gravar o cookie novo
   * @returns Access token novo e usuário
   *
   * @example
   * POST /auth/refresh
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    try {
      return this.respondWithSession(await this.authService.refresh(this.readRefreshCookie(req)), res);
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  /**
   * PUBLIC ENDPOINT — intentionally unauthenticated.
   * Motivo: precisa funcionar com o access token já expirado.
   *
   * @param req - Requisição, para ler o cookie
   * @param res - Resposta, para apagar o cookie
   *
   * @example
   * POST /auth/logout
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.logout(this.readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  /**
   * Devolve o usuário da sessão atual.
   *
   * @param user - Usuário autenticado
   * @returns Usuário
   *
   * @example
   * GET /auth/me
   */
  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<User> {
    return this.usersService.findById(user.userId);
  }

  /**
   * Troca a senha e encerra as outras sessões.
   *
   * @param user - Usuário autenticado
   * @param dto - Senha atual e nova
   * @param res - Resposta, para apagar o cookie atual
   *
   * @example
   * PATCH /auth/password { "currentPassword": "...", "newPassword": "..." }
   */
  @Throttle(CREDENTIAL_THROTTLE)
  @Patch('password')
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.authService.changePassword(user.userId, dto);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  /**
   * Grava o cookie do refresh e monta o corpo da resposta.
   *
   * @param session - Sessão emitida
   * @param res - Resposta
   * @returns Corpo sem o refresh token
   */
  private respondWithSession(session: IssuedSession, res: Response): SessionResponse {
    res.cookie(REFRESH_COOKIE, session.refreshToken, { ...this.cookieOptions(), expires: session.refreshExpiresAt });
    return { accessToken: session.accessToken, user: session.user };
  }

  /**
   * Lê o refresh token do cookie.
   *
   * @param req - Requisição
   * @returns Valor do cookie, se houver
   */
  private readRefreshCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[REFRESH_COOKIE];
  }

  /**
   * Opções do cookie: `httpOnly`, `SameSite=Strict`, `Secure` fora do
   * desenvolvimento. `path: '/'` porque o front chega pelo proxy `/api`.
   *
   * @returns Opções do cookie
   */
  private cookieOptions(): CookieOptions {
    return { httpOnly: true, sameSite: 'strict', secure: this.config.get('NODE_ENV', { infer: true }) === 'production', path: '/' };
  }
}
