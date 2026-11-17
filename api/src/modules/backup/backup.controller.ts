/**
 * Rotas de backup: exportar e importar os dados do usuário.
 *
 * @module modules/backup/backup.controller
 */
import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '~/common/decorators';
import { type AuthUser } from '~/common/types/auth-user.type';
import { type BackupFile } from './backup.format';
import { type BackupImportResult, BackupService } from './backup.service';
import { ImportBackupDto } from './dto/import-backup.dto';

/**
 * Backup dos dados: o arquivo exportado restaura tudo no import.
 *
 * @example
 * GET /backup/export
 */
@ApiTags('backup')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * Exporta todos os dados do usuário.
   *
   * @param user - Usuário autenticado
   * @returns Arquivo de backup
   *
   * @example
   * GET /backup/export
   */
  @Get('export')
  export(@CurrentUser() user: AuthUser): Promise<BackupFile> {
    return this.backupService.export(user.userId);
  }

  /**
   * Substitui os dados do usuário pelos do arquivo.
   *
   * @param user - Usuário autenticado
   * @param dto - Arquivo de backup
   * @returns Quantidade restaurada por tabela
   *
   * @example
   * POST /backup/import { "format": "finance-manager-backup", "version": 2, "data": { ... } }
   */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  import(@CurrentUser() user: AuthUser, @Body() dto: ImportBackupDto): Promise<BackupImportResult> {
    return this.backupService.import(user.userId, dto);
  }
}
