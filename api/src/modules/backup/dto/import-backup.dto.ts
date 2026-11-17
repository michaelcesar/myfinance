/**
 * Corpo da importação de backup.
 *
 * A validação daqui é só da casca (identificação, versão, `data` como
 * objeto); o conteúdo de cada tabela é conferido pelo `BackupService` e,
 * linha a linha, pelas restrições do próprio banco, dentro da transação.
 *
 * @module modules/backup/dto/import-backup.dto
 */
import { IsDefined, IsInt, IsObject, IsOptional, IsString } from 'class-validator';

/** Arquivo de backup enviado para restauração. */
export class ImportBackupDto {
  @IsString({ message: 'Este arquivo não é um backup do Finance Manager.' })
  format: string;

  @IsInt({ message: 'Versão de backup inválida.' })
  version: number;

  @IsOptional()
  @IsString()
  exportedAt?: string;

  @IsOptional()
  @IsObject()
  owner?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  counts?: Record<string, unknown>;

  @IsDefined({ message: 'O backup não tem dados.' })
  @IsObject({ message: 'O backup não tem dados.' })
  data: Record<string, unknown>;
}
