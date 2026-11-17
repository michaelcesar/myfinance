/**
 * Opções do TypeORM compartilhadas entre a aplicação e o CLI de migrations.
 *
 * @module config/database.config
 */
import { type DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from './naming.strategy';

/** Parâmetros que variam entre a aplicação e o CLI. */
export interface DatabaseConfigInput {
  url: string;
  logging: boolean;
  synchronize: boolean;
}

/**
 * Monta as opções do Postgres com a estratégia de nomes do projeto.
 *
 * As migrations não entram aqui: só o CLI (`datasource.ts`) as carrega. A
 * aplicação compilada não deve importar os `.ts` de `database/` — o Node
 * tentaria executá-los e o boot cairia.
 *
 * `synchronize` chega já resolvido: quem chama é responsável por nunca
 * passar `true` em produção (`CONSTRAINTS.md` C01).
 *
 * @param input - URL, log e sincronização
 * @returns Opções prontas para `DataSource` ou `TypeOrmModule`
 *
 * @example
 * buildDatabaseOptions({ url: env.POSTGRES_URI, logging: false, synchronize: false });
 */
export function buildDatabaseOptions(input: DatabaseConfigInput): DataSourceOptions {
  return {
    type: 'postgres',
    url: input.url,
    logging: input.logging,
    synchronize: input.synchronize,
    namingStrategy: new SnakeNamingStrategy(),
    migrationsTableName: 'typeorm_migration',
  };
}
