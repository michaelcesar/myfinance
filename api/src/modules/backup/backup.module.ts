/**
 * Módulo de backup (exportar/importar os dados do usuário).
 *
 * @module modules/backup/backup.module
 */
import { Module } from '@nestjs/common';
import { UsersModule } from '~/modules/users/users.module';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';

/** Backup em JSON de todas as tabelas do usuário. */
@Module({
  imports: [UsersModule],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
