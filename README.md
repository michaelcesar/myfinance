# Finance Manager

Personal finance app with personal and company ledgers, recurrences, forecast
and analysis. It is meant to run **only on your own machine**, in Docker.

| Folder | What it is |
| --- | --- |
| [`api/`](api/README.md) | NestJS API with PostgreSQL (TypeORM) |
| [`web/`](web/README.md) | Next.js web app |
| [`infra/`](infra/README.md) | Docker Compose stack that runs everything locally |

## Quick start

Requirements: Docker with Compose v2, `make` and `openssl`.

```bash
cd infra
make setup   # creates infra/.env with random secrets
make up      # builds the images, runs the migrations and starts everything
```

Open **http://localhost:8080** and create your account. Backups, restore and
the other commands are in [`infra/README.md`](infra/README.md).

To work on the code without Docker, see [`api/README.md`](api/README.md) and
[`web/README.md`](web/README.md).
