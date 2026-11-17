/**
 * Limpeza periódica de refresh tokens vencidos.
 *
 * @module modules/auth/auth.cron
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthService } from './auth.service';

/**
 * Apaga, todo dia às 3h, os refresh tokens vencidos há mais de um dia.
 *
 * @example
 * providers: [AuthCronService]
 */
@Injectable()
export class AuthCronService {
  private readonly logger = new Logger(AuthCronService.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Executa a limpeza.
   *
   * @example
   * await authCron.purgeExpiredTokens();
   */
  @Cron('0 3 * * *')
  async purgeExpiredTokens(): Promise<void> {
    const removed = await this.authService.purgeExpiredTokens();
    this.logger.log(`Refresh tokens vencidos removidos: ${removed}`);
  }
}
