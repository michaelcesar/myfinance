/**
 * Serviço de autenticação: cadastro, login e sessão por dois tokens.
 *
 * @module modules/auth/auth.service
 */
import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { DataSource, LessThan, Repository } from 'typeorm';
import { type Env } from '~/config/env.validation';
import { type JwtPayload } from '~/common/types/auth-user.type';
import { CategoriesService } from '~/modules/categories/categories.service';
import { LedgersService } from '~/modules/ledgers/ledgers.service';
import { type User } from '~/modules/users/entities/user.entity';
import { UsersService } from '~/modules/users/users.service';
import { type ChangePasswordDto } from './dto/change-password.dto';
import { type LoginDto } from './dto/login.dto';
import { type RegisterDto } from './dto/register.dto';
import { RefreshToken } from './entities/refresh-token.entity';

/** Custo do bcrypt. */
const BCRYPT_ROUNDS = 12;

/** Sessão emitida: o access token vai no corpo, o refresh no cookie. */
export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: User;
}

/**
 * Calcula o SHA-256 em hex de um refresh token.
 *
 * @param token - Token em claro
 * @returns Hash gravado no banco
 *
 * @example
 * hashToken('abc'); // 'ba7816bf...'
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Cadastro, login, renovação e encerramento de sessão.
 *
 * Access token: JWT curto (15 min) mantido só na memória do front.
 * Refresh token: aleatório, 7 dias, em cookie `httpOnly`, rotacionado a cada
 * uso (`ADR-003`).
 *
 * @example
 * const session = await authService.login({ email, password });
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
    private readonly usersService: UsersService,
    private readonly ledgersService: LedgersService,
    private readonly categoriesService: CategoriesService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Informa se o cadastro está aberto: sempre para o primeiro usuário,
   * depois só com `ALLOW_SIGNUP=true`.
   *
   * @returns `true` quando um novo cadastro é aceito
   *
   * @example
   * const open = await authService.isSignupOpen();
   */
  async isSignupOpen(): Promise<boolean> {
    if (this.config.get('ALLOW_SIGNUP', { infer: true })) return true;
    return (await this.usersService.count()) === 0;
  }

  /**
   * Cadastra o usuário com o livro pessoal e as categorias padrão, numa
   * única transação, e já abre a sessão.
   *
   * @param dto - Nome, e-mail e senha
   * @returns Sessão emitida
   * @throws `ForbiddenException` com o cadastro fechado
   *
   * @example
   * const session = await authService.register({ name: 'Ana', email: 'ana@exemplo.com', password: '12345678' });
   */
  async register(dto: RegisterDto): Promise<IssuedSession> {
    if (!(await this.isSignupOpen())) throw new ForbiddenException('O cadastro está fechado.');
    const passwordHash = await hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.dataSource.transaction(async manager => {
      const created = await this.usersService.create(manager, { name: dto.name.trim(), email: dto.email, passwordHash });
      await this.ledgersService.createPersonal(manager, created.userId);
      await this.categoriesService.seedDefaults(manager, created.userId);
      return created;
    });
    return this.issueSession(user);
  }

  /**
   * Confere as credenciais e abre a sessão.
   *
   * @param dto - E-mail e senha
   * @returns Sessão emitida
   * @throws `UnauthorizedException` com mensagem única para e-mail ou senha errados
   *
   * @example
   * await authService.login({ email: 'ana@exemplo.com', password: '12345678' });
   */
  async login(dto: LoginDto): Promise<IssuedSession> {
    const user = await this.usersService.findByEmailWithHash(dto.email);
    const valid = user ? await compare(dto.password, user.passwordHash) : false;
    if (!user || !valid) throw new UnauthorizedException('E-mail ou senha incorretos.');
    return this.issueSession(user);
  }

  /**
   * Troca o refresh token por uma sessão nova; o token usado é revogado.
   *
   * @param refreshToken - Valor do cookie
   * @returns Sessão nova
   * @throws `UnauthorizedException` com token ausente, revogado ou expirado
   *
   * @example
   * await authService.refresh(req.cookies.financial_rt);
   */
  async refresh(refreshToken: string | undefined): Promise<IssuedSession> {
    if (!refreshToken) throw new UnauthorizedException('Sessão ausente.');
    const stored = await this.refreshRepo.findOne({ where: { tokenHash: hashToken(refreshToken) } });
    if (!stored || stored.revoked || stored.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('Sessão expirada.');
    stored.revoked = true;
    await this.refreshRepo.save(stored);
    const user = await this.usersService.findById(stored.userId);
    return this.issueSession(user);
  }

  /**
   * Revoga o refresh token, se houver. Idempotente.
   *
   * @param refreshToken - Valor do cookie
   *
   * @example
   * await authService.logout(req.cookies.financial_rt);
   */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.refreshRepo.update({ tokenHash: hashToken(refreshToken) }, { revoked: true });
  }

  /**
   * Troca a senha e revoga todas as sessões do usuário.
   *
   * @param userId - Usuário logado
   * @param dto - Senha atual e nova
   * @throws `UnauthorizedException` com a senha atual errada
   *
   * @example
   * await authService.changePassword(userId, { currentPassword, newPassword });
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findByIdWithHash(userId);
    if (!(await compare(dto.currentPassword, user.passwordHash))) throw new UnauthorizedException('A senha atual não confere.');
    await this.usersService.updatePasswordHash(userId, await hash(dto.newPassword, BCRYPT_ROUNDS));
    await this.refreshRepo.update({ userId, revoked: false }, { revoked: true });
  }

  /**
   * Remove refresh tokens vencidos há mais de um dia.
   *
   * @returns Quantidade removida
   *
   * @example
   * await authService.purgeExpiredTokens();
   */
  async purgeExpiredTokens(): Promise<number> {
    const result = await this.refreshRepo.delete({ expiresAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)) });
    return result.affected ?? 0;
  }

  /**
   * Assina o access token e grava um refresh token novo.
   *
   * @param user - Usuário autenticado
   * @returns Sessão emitida
   */
  private async issueSession(user: User): Promise<IssuedSession> {
    const payload: JwtPayload = { userId: user.userId, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = randomBytes(32).toString('hex');
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    const refreshExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.refreshRepo.save(this.refreshRepo.create({ userId: user.userId, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiresAt }));
    const { passwordHash: _passwordHash, ...safeUser } = user;
    this.logger.log(`Sessão emitida para ${user.userId}`);
    return { accessToken, refreshToken, refreshExpiresAt, user: safeUser as User };
  }
}
