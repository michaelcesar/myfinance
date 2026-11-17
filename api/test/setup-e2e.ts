/**
 * Ambiente dos testes e2e: `AppModule` real contra um Postgres de teste.
 *
 * Valores ausentes caem nos padrões locais (`financial_test` no container de
 * `tools/docker/docker-compose.yml`). `TYPEORM_SYNC=true` cria o schema no
 * banco de teste; nunca vale em produção, porque o `AppModule` trava o
 * `synchronize` a `NODE_ENV !== 'production'`.
 *
 * Os testes começam com `TRUNCATE user_account CASCADE`, então só rodam num
 * banco cujo nome termina em `_test` — um `POSTGRES_URI` de desenvolvimento
 * herdado do shell (por exemplo, depois de carregar o `.env.example`) apagaria
 * os dados de verdade.
 *
 * @module test/setup-e2e
 */
process.env.NODE_ENV = 'test';
process.env.TYPEORM_SYNC = 'true';
process.env.ALLOW_SIGNUP = 'true';
process.env.APP_SECRET ??= 'e2e-secret-with-at-least-thirty-two-chars';
process.env.FRONTEND_DOMAIN ??= 'http://localhost:3000';
process.env.POSTGRES_URI ??= 'postgresql://postgres:postgres@localhost:5435/financial_test';

const databaseName = new URL(process.env.POSTGRES_URI).pathname.slice(1);
if (!databaseName.endsWith('_test')) {
  throw new Error(`Testes e2e recusados: o banco "${databaseName}" não termina em "_test". Use um banco de teste.`);
}
