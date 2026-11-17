# Finance Manager

Personal finance app with personal and company ledgers, recurrences, forecast
and analysis. This repository (`infra/`) runs the whole thing in Docker, **only
on this machine**: a NestJS API (`../api`), a Next.js web app (`../web`) and
PostgreSQL 16, as one compose project (`finance`) with three containers:
`postgres`, `back-end` and `front-end`. The only published port is the
front-end's, bound to `127.0.0.1`, so nothing is exposed to the network.

```
browser --> 127.0.0.1:8080 --> front-end (Next.js) --/api/*--> back-end (NestJS) --> postgres (16)
                                 `-------------- internal compose network (finance) --------------'
```

## Requirements

- Docker with Compose v2, `make` and `openssl`.
- `curl` and `jq` for `make ci`.
- The three repositories side by side: `financial/{api,web,infra}`.

## First run

```bash
cd infra
make setup   # creates infra/.env with random APP_SECRET and database password
make up      # builds the images, runs the migrations and starts everything
```

Open **http://localhost:8080** and create your account. The first user can
always sign up; after that sign-up closes (`ALLOW_SIGNUP=false`).

Use `localhost` (or `127.0.0.1`), not the machine's IP: the API runs in
production mode and the session cookie is `Secure`, which browsers only accept
over plain HTTP on loopback addresses.

## Daily use

| Command | What it does |
| --- | --- |
| `make up` | Starts the stack and waits until everything is healthy |
| `make down` | Stops and removes the containers (data stays in the volume) |
| `make ps` | Container status and health |
| `make logs` / `make logs S=back-end` | Logs of everything / of one container |
| `make restart` | Restarts back-end and front-end |
| `make rebuild` | Rebuilds the images and starts the new version |
| `make backup` | Dumps the database to `infra/backups/` |
| `make restore FILE=...` | Restores a dump |
| `make config` | Validates `docker-compose.yml` with the current `.env` |
| `make ci` | Local CI of the stack |
| `make help` | Lists all targets |

The containers use `restart: unless-stopped`: they come back on their own when
Docker restarts (machine boot), unless you ran `make down`.

## Backups and restore

There are two kinds of backup:

- **App export/import**: the app exports and imports a user's data as JSON from
  the Settings screen (`/api/backup/export`).
- **Whole database**: `make backup` and `make restore`.

```bash
make backup                                              # infra/backups/finance-manager-YYYYMMDD-HHMMSS.dump
make restore FILE=backups/finance-manager-20261117-103000.dump
```

- `backup` runs `pg_dump` in custom format, checks the file and keeps the
  newest `BACKUP_KEEP` dumps (default 14, set in `.env`). To schedule it, a cron
  entry such as `0 3 * * * make -C /path/to/financial/infra backup` is enough.
- `restore` asks for confirmation, takes a safety backup first
  (`backups/pre-restore-*.dump`, outside the rotation), stops back-end and
  front-end, recreates the database, restores the dump and starts everything
  again (applying migrations the backup did not have yet).
- `infra/backups/` and `infra/.env` are never committed. Copy the dumps off
  this machine (external disk, cloud): a backup on the same disk does not
  protect against losing the disk.

## Updating

```bash
make rebuild   # rebuilds the back-end and front-end images and starts the new version
```

New migrations run on their own: on start, `back-end` applies whatever is
pending before starting the API; if a migration fails it never becomes healthy
and the front-end does not start (`make logs S=back-end` shows the error). Run
`make backup` before starting a version with a new migration.

## Configuration (`infra/.env`)

| Variable | Default | Notes |
| --- | --- | --- |
| `APP_PORT` | `8080` | Host port (always on `127.0.0.1`) |
| `APP_SECRET` | none | Required, at least 32 characters. Changing it ends all sessions |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `finance` / none / `finance_manager` | Only take effect when the volume is created; password with letters and digits only |
| `ALLOW_SIGNUP` | `false` | Sign-up open beyond the first user |
| `ACCESS_TOKEN_TTL_SECONDS` / `REFRESH_TOKEN_TTL_DAYS` | `900` / `7` | Session lifetimes |
| `BACKUP_KEEP` | `14` | How many dumps `make backup` keeps |

Changed `.env`? `make up` recreates the affected containers.

## Ports

| Service | Port | Published? |
| --- | --- | --- |
| front-end | 3000 in the container, `127.0.0.1:${APP_PORT}` on the host | yes, loopback only |
| back-end | 3001 | no (only the front-end talks to it) |
| postgres | 5432 | no (use `docker exec -it postgres psql -U finance finance_manager`) |

This coexists with the development environment (`financial_postgres` on
`127.0.0.1:5435`, `next dev` on `:3000`, `nest start` on `:3001`): different
containers, volumes and ports.

## Checks

```bash
make ci   # or scripts/ci-local.sh
```

It validates the compose file, runs shellcheck, builds the images, starts a
throwaway stack (own project, port and secrets, never reading `.env`) and runs
smoke tests through the front-end proxy (sign-in page, health, sign-up, login,
backup export and import). It then tests backup and restore and tears
everything down, volumes included. CI containers are prefixed `fm-ci-<pid>-`,
so it runs while the real stack is up.

## Layout

```
financial/
  api/     NestJS API
  web/     Next.js web app
  infra/   this repository: compose file, Makefile, scripts/ (setup, backup, restore, CI)
```

`../api` and `../web` are sibling repositories, built from their working trees
by `make up` and `make rebuild`. Their `docs/` folders are local-only.

## Wiping everything

`make down` keeps the data. To delete the database for good (irreversible):
`docker compose down --volumes`. Run `make backup` first.
