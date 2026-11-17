/**
 * `DataSource` usado só pelo CLI de migrations (`pnpm run migration:*`).
 *
 * A aplicação não importa este arquivo: ela registra as entidades via
 * `autoLoadEntities`. Aqui as entidades entram por glob, e `synchronize`
 * é fixo em `false`.
 *
 * O mesmo arquivo serve a dois modos:
 * - desenvolvimento (`pnpm run migration:run`): roda pelo ts-node a partir de
 *   `src/config/`, e as migrations são os `.ts` de `database/migrations/`;
 * - produção (`pnpm run migration:run:prod`, na imagem Docker): roda com
 *   `node` puro a partir de `dist/config/`, e as migrations são os `.js` que
 *   o `build:migrations` compila em `dist/database/migrations/`.
 *
 * O modo sai da extensão do próprio arquivo, não de `NODE_ENV`: o que decide
 * se dá para carregar `.ts` é quem está executando, não o ambiente declarado.
 *
 * @module config/datasource
 */
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from './database.config';

loadEnv({ quiet: true });

/** `true` quando este arquivo roda como TypeScript (ts-node); `false` quando já compilado. */
const runningFromSource = __filename.endsWith('.ts');

/**
 * Glob das migrations para o modo atual.
 *
 * Fonte: `src/config/` → `database/migrations/*.ts` na raiz do projeto.
 * Compilado: `dist/config/` → `dist/database/migrations/*.js`.
 */
const migrationsGlob = runningFromSource ? `${__dirname}/../../database/migrations/*.ts` : `${__dirname}/../database/migrations/*.js`;

export default new DataSource({
  ...buildDatabaseOptions({
    url: process.env.POSTGRES_URI ?? '',
    logging: process.env.TYPEORM_LOG === 'true',
    synchronize: false,
  }),
  entities: [`${__dirname}/../modules/**/*.entity.${runningFromSource ? 'ts' : 'js'}`],
  migrations: [migrationsGlob],
});
