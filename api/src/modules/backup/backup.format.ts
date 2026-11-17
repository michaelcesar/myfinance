/**
 * Formato do arquivo de backup: identificação, versão e a ordem das tabelas.
 *
 * O backup é um JSON com todas as linhas do usuário, tabela por tabela, com os
 * mesmos ids do banco. A ordem de `BACKUP_TABLES` respeita as chaves
 * estrangeiras: importar insere nessa ordem e apaga na ordem inversa.
 *
 * @module modules/backup/backup.format
 */
import { type EntityTarget, type ObjectLiteral } from 'typeorm';
import { Account } from '~/modules/accounts/entities/account.entity';
import { Category } from '~/modules/categories/entities/category.entity';
import { InvestmentMovement } from '~/modules/investments/entities/investment-movement.entity';
import { Investment } from '~/modules/investments/entities/investment.entity';
import { Ledger } from '~/modules/ledgers/entities/ledger.entity';
import { RecurrenceSkip } from '~/modules/recurrences/entities/recurrence-skip.entity';
import { Recurrence } from '~/modules/recurrences/entities/recurrence.entity';
import { Transaction } from '~/modules/transactions/entities/transaction.entity';
import { Transfer } from '~/modules/transactions/entities/transfer.entity';

/** Identificador do formato, gravado em todo arquivo. */
export const BACKUP_FORMAT = 'finance-manager-backup';

/** Versão do formato. Sobe quando a estrutura das tabelas muda. A 2 trouxe os recorrentes; a 3 tirou os contratantes; a 4, as fontes de renda. */
export const BACKUP_VERSION = 4;

/**
 * Versões que o import lê. Tabela ausente vira lista vazia; tabela e coluna que
 * não existem mais (contratantes, fontes de renda, `clientId`, `incomeSourceId`) são ignoradas.
 */
export const SUPPORTED_BACKUP_VERSIONS: readonly number[] = [1, 2, 3, 4];

/** Tabela incluída no backup: a chave no JSON, a entidade e o nome da chave primária. */
export interface BackupTable {
  key: BackupTableKey;
  entity: EntityTarget<ObjectLiteral>;
  primaryKey: string;
}

/** Chaves das tabelas dentro de `data`. */
export type BackupTableKey = 'ledgers' | 'categories' | 'accounts' | 'recurrences' | 'recurrenceSkips' | 'investments' | 'investmentMovements' | 'transfers' | 'transactions';

/** Tabelas na ordem em que podem ser inseridas sem quebrar chave estrangeira. */
export const BACKUP_TABLES: readonly BackupTable[] = [
  { key: 'ledgers', entity: Ledger, primaryKey: 'ledgerId' },
  { key: 'categories', entity: Category, primaryKey: 'categoryId' },
  { key: 'accounts', entity: Account, primaryKey: 'accountId' },
  { key: 'recurrences', entity: Recurrence, primaryKey: 'recurrenceId' },
  { key: 'recurrenceSkips', entity: RecurrenceSkip, primaryKey: 'recurrenceSkipId' },
  { key: 'investments', entity: Investment, primaryKey: 'investmentId' },
  { key: 'investmentMovements', entity: InvestmentMovement, primaryKey: 'investmentMovementId' },
  { key: 'transfers', entity: Transfer, primaryKey: 'transferId' },
  { key: 'transactions', entity: Transaction, primaryKey: 'transactionId' },
];

/** Linhas de cada tabela, sem o `userId` (no import, as linhas passam a ser de quem importa). */
export type BackupData = Record<BackupTableKey, Record<string, unknown>[]>;

/** Quantidade de linhas por tabela. */
export type BackupCounts = Record<BackupTableKey, number>;

/** Arquivo de backup completo. */
export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  owner: { name: string; email: string };
  counts: BackupCounts;
  data: BackupData;
}
