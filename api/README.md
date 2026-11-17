# Finance Manager API

Back-end of Finance Manager, a personal finance app that runs locally only (no deploy).
NestJS 11, TypeORM, PostgreSQL 16.

Modules: auth, ledgers, accounts, categories, transactions and transfers, recurrences,
investments and assets, dashboard (summary, forecast, analysis) and backup.

## Requirements

- Node.js as pinned in `.nvmrc`
- pnpm via Corepack (`corepack enable`)
- Docker, for PostgreSQL

## Development

```bash
docker compose -f tools/docker/docker-compose.yml up -d   # PostgreSQL on 127.0.0.1:5435
cp .env.example .env                                       # set APP_SECRET and POSTGRES_URI
pnpm install
pnpm run migration:run
pnpm run start:dev                                         # http://localhost:3001
```

Optional demo data: `pnpm run seed:demo` (uses `SEED_DEMO_EMAIL` and `SEED_DEMO_PASSWORD`; set the password in `.env` first).

## Tests

- `pnpm test`: unit tests.
- `pnpm test:e2e`: full app against a real PostgreSQL; it refuses any database whose name does not end in `_test`.

## Checks

- `pnpm lint` and `pnpm typecheck`.
- `scripts/ci-local.sh` runs the same jobs as `.github/workflows/ci.yml` on a clean clone, in Docker. The pre-push hook runs it.
- Enable the hooks once per clone: `git config core.hooksPath .githooks`.

## Running everything together

To run the database, API and web app as one stack, see the README in `../infra`. The app is then served at http://localhost:8080.

## Local-only files

`docs/`, `CLAUDE.md` and `AGENTS.md` are kept on disk only and are not versioned.
