# Financial API

Back-end of **Financial**, a finance system for one owner that keeps personal money and the money of
each of the owner's companies apart — and shows them consolidated without double counting.

- NestJS 11 · TypeScript (strict) · PostgreSQL 16 · TypeORM 0.3 · Node 22 · pnpm 9
- Dual-token auth (15-minute access JWT + rotating 7-day refresh token in an httpOnly cookie)
- Ledgers (personal + companies), accounts with derived balances, categories, clients (third-party
  payers), income sources, income/expense, transfers between ledgers (pró-labore, profit
  distribution, capital contribution), investments with contributions/withdrawals/yields, dashboards

## Requirements

- Node.js 22 with Corepack enabled (`corepack enable`)
- Docker (local PostgreSQL)

## Setup

```bash
docker compose -f tools/docker/docker-compose.yml up -d   # PostgreSQL on 127.0.0.1:5435
cp .env.example .env                                       # set APP_SECRET (32+ chars)
pnpm install
pnpm run migration:run
pnpm run start:dev                                         # http://localhost:3001, Swagger at /docs
```

Optional demo data: `pnpm run seed:demo` (uses `SEED_DEMO_EMAIL` / `SEED_DEMO_PASSWORD`).
Start over: `pnpm run db:reset`. The first user to sign up gets the account; further sign-ups need
`ALLOW_SIGNUP=true`.

## Scripts

| Script | What it does |
|---|---|
| `start:dev` | Nest in watch mode |
| `build` / `start:prod` | Compile to `dist/` / run it |
| `lint` / `format` | ESLint + Prettier check / write |
| `typecheck` | `tsc --noEmit` |
| `test` | Unit tests and executable code-style guards |
| `test:e2e` | Full app against a real PostgreSQL (`financial_test` database) |
| `migration:generate <path>` / `migration:run` / `migration:revert` | TypeORM migrations |
| `seed:demo` | Demo user with six months of data |
| `precommit` | lint-staged + lint + typecheck + test |

Git hooks: `git config core.hooksPath .githooks` — pre-commit lints staged files, pre-push runs
`scripts/ci-local.sh` (the same jobs as `.github/workflows/ci.yml`, on a clean clone, in Docker).

## API

All responses use an envelope: `{ "success": true, "data": ... }` or
`{ "success": false, "statusCode", "error", "details?", "timestamp", "path" }`. Every route requires
`Authorization: Bearer <accessToken>` except the ones marked public (auth and health).

| Area | Routes |
|---|---|
| Auth | `POST /auth/register` `POST /auth/login` `POST /auth/refresh` `POST /auth/logout` `GET /auth/me` `PATCH /auth/password` `GET /auth/signup-status` |
| Ledgers | `GET/POST /ledgers` `GET/PATCH/DELETE /ledgers/:id` |
| Accounts | `GET/POST /accounts` `GET/PATCH/DELETE /accounts/:id` |
| Categories | `GET/POST /categories` `PATCH/DELETE /categories/:id` |
| Clients | `GET/POST /clients` `GET/PATCH/DELETE /clients/:id` |
| Income sources | `GET/POST /income-sources` `GET/PATCH/DELETE /income-sources/:id` |
| Transactions | `GET/POST /transactions` `GET/PATCH/DELETE /transactions/:id` |
| Transfers | `POST /transfers` `GET/PATCH/DELETE /transfers/:id` |
| Investments | `GET/POST /investments` `GET/PATCH/DELETE /investments/:id` `GET/POST /investments/:id/movements` `DELETE /investments/:id/movements/:movementId` |
| Dashboard | `GET /dashboard/overview?from&to` `GET /dashboard/ledgers/:id?from&to` |
| Health | `GET /health` |

Lists accept the `nestjs-paginate` query syntax (`limit`, `page`, `search`, `sortBy`,
`filter.<field>=$eq:<value>`). Money is always integer cents.

## License

UNLICENSED — private project.
