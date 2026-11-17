/**
 * Exportação e importação dos dados do usuário (backup).
 *
 * Exportar lê todas as tabelas do usuário e devolve um `BackupFile`.
 * Importar **substitui** tudo: numa única transação, apaga as linhas do
 * usuário (na ordem inversa das chaves estrangeiras) e insere as do arquivo
 * (na ordem direta), mantendo os ids. Se qualquer linha falhar, nada muda.
 *
 * @module modules/backup/backup.service
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager, QueryFailedError } from 'typeorm';
import { UsersService } from '~/modules/users/users.service';
import { BACKUP_FORMAT, BACKUP_TABLES, BACKUP_VERSION, type BackupCounts, type BackupData, type BackupFile, type BackupTable, SUPPORTED_BACKUP_VERSIONS } from './backup.format';

/** Linhas por `INSERT` — evita um comando gigante com milhares de lançamentos. */
const INSERT_CHUNK = 500;

/** Padrão de UUID das chaves primárias. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resultado da importação: o que foi restaurado. */
export interface BackupImportResult {
  counts: BackupCounts;
}

/**
 * Serviço de backup.
 *
 * @example
 * const file = await backupService.export(userId);
 * await backupService.import(userId, file);
 */
@Injectable()
export class BackupService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly usersService: UsersService
  ) {}

  /**
   * Monta o arquivo de backup com todas as linhas do usuário.
   *
   * @param userId - Dono dos dados
   * @returns Arquivo pronto para salvar
   *
   * @example
   * const file = await backupService.export(userId); // file.counts.transactions === 412
   */
  async export(userId: string): Promise<BackupFile> {
    const user = await this.usersService.findById(userId);
    const data = {} as BackupData;
    const counts = {} as BackupCounts;
    for (const table of BACKUP_TABLES) {
      const rows = await this.dataSource.manager.find(table.entity, { where: { userId }, order: { createdAt: 'ASC' } });
      data[table.key] = rows.map(row => this.toPlainRow(table, row));
      counts[table.key] = rows.length;
    }
    return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), owner: { name: user.name, email: user.email }, counts, data };
  }

  /**
   * Substitui os dados do usuário pelos do arquivo, numa transação.
   *
   * @param userId - Quem importa (as linhas passam a ser dele)
   * @param file - Arquivo de backup
   * @returns Quantidade restaurada por tabela
   * @throws BadRequestException quando o arquivo não é um backup válido ou tem dados inconsistentes
   *
   * @example
   * const { counts } = await backupService.import(userId, file);
   */
  async import(userId: string, file: unknown): Promise<BackupImportResult> {
    const data = this.parse(file);
    try {
      return await this.dataSource.transaction(async manager => {
        for (const table of [...BACKUP_TABLES].reverse()) await manager.delete(table.entity, { userId });
        const counts = {} as BackupCounts;
        for (const table of BACKUP_TABLES) {
          const rows = data[table.key].map(row => ({ ...this.pickColumns(manager, table, row), userId }));
          for (let start = 0; start < rows.length; start += INSERT_CHUNK) await manager.insert(table.entity, rows.slice(start, start + INSERT_CHUNK));
          counts[table.key] = rows.length;
        }
        return { counts };
      });
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const detail = (error.driverError as { detail?: string } | undefined)?.detail ?? error.message;
        throw new BadRequestException(['O arquivo tem dados inconsistentes; nada foi alterado.', detail]);
      }
      throw error;
    }
  }

  /**
   * Confere identificação, versão e estrutura do arquivo.
   *
   * @param file - Corpo recebido
   * @returns As tabelas do arquivo (tabela ausente vira lista vazia)
   * @throws BadRequestException quando não é um backup desta aplicação
   */
  private parse(file: unknown): BackupData {
    const candidate = file as Partial<BackupFile> | null;
    if (!candidate || typeof candidate !== 'object' || candidate.format !== BACKUP_FORMAT) {
      throw new BadRequestException('Este arquivo não é um backup do Finance Manager.');
    }
    if (typeof candidate.version !== 'number' || !SUPPORTED_BACKUP_VERSIONS.includes(candidate.version)) {
      throw new BadRequestException(`Versão de backup não suportada (${String(candidate.version)}); esta versão lê ${SUPPORTED_BACKUP_VERSIONS.join(' e ')}.`);
    }
    if (!candidate.data || typeof candidate.data !== 'object') throw new BadRequestException('O backup não tem dados.');
    const data = {} as BackupData;
    for (const table of BACKUP_TABLES) {
      const rows: unknown = (candidate.data as Partial<BackupData>)[table.key] ?? [];
      if (!Array.isArray(rows)) throw new BadRequestException(`A tabela "${table.key}" do backup está corrompida.`);
      const invalid = rows.findIndex(row => !row || typeof row !== 'object' || !UUID_PATTERN.test(String((row as Record<string, unknown>)[table.primaryKey])));
      if (invalid !== -1) throw new BadRequestException(`A linha ${invalid + 1} da tabela "${table.key}" está sem id válido.`);
      data[table.key] = rows as Record<string, unknown>[];
    }
    return data;
  }

  /**
   * Linha exportável: só as colunas, sem o dono.
   *
   * @param table - Tabela
   * @param row - Entidade lida do banco
   * @returns Objeto simples
   */
  private toPlainRow(table: BackupTable, row: object): Record<string, unknown> {
    const plain = this.pickColumns(this.dataSource.manager, table, row as Record<string, unknown>);
    delete plain.userId;
    return plain;
  }

  /**
   * Mantém só as propriedades que são colunas da tabela (descarta relações e chaves estranhas).
   *
   * @param manager - Gerenciador com os metadados
   * @param table - Tabela
   * @param row - Linha de origem
   * @returns Linha só com colunas
   */
  private pickColumns(manager: EntityManager, table: BackupTable, row: Record<string, unknown>): Record<string, unknown> {
    const columns = manager.connection.getMetadata(table.entity).columns.map(column => column.propertyName);
    return Object.fromEntries(columns.filter(column => row[column] !== undefined).map(column => [column, row[column]]));
  }
}
