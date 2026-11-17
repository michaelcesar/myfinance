# Finance Manager — stack local

Roda o Finance Manager (API `../api` + web `../web` + PostgreSQL) em Docker,
**só nesta máquina**. Tudo fica no grupo `finance`, com três containers:
`postgres`, `back-end` e `front-end`. A única porta publicada é a do front-end, e só em
`127.0.0.1` — nada fica exposto à rede.

```
navegador ──► 127.0.0.1:8080 ──► front-end (Next.js) ──/api/*──► back-end (NestJS) ──► postgres (16)
                                  └─────────────── rede interna do compose (finance) ──────────────┘
```

Requisitos: Docker com Compose v2, `make`, `openssl` (e `curl` + `jq` para o
`make ci`). Os três repositórios lado a lado: `financial/{api,web,infra}`.

## Primeira vez

```bash
cd infra
make setup   # cria infra/.env com APP_SECRET e senha do banco aleatórios
make up      # builda as imagens, roda as migrations e sobe tudo
```

Abra **http://localhost:8080** e crie a conta — o primeiro usuário sempre pode
se cadastrar; depois dele o cadastro fecha (`ALLOW_SIGNUP=false`).

Use `localhost` (ou `127.0.0.1`), não o IP da máquina: a API roda em modo
produção e o cookie de sessão é `Secure`, que os navegadores só aceitam via
HTTP em endereços de loopback.

## Dia a dia

| Comando | O que faz |
| --- | --- |
| `make up` | Sobe o stack e espera tudo ficar saudável |
| `make down` | Para e remove os containers (os dados ficam no volume) |
| `make ps` | Estado e saúde dos containers |
| `make logs` / `make logs S=back-end` | Logs de todos / de um container |
| `make restart` | Reinicia back-end e front-end |
| `make help` | Lista todos os alvos |

Os containers têm `restart: unless-stopped`: voltam sozinhos quando o Docker
reinicia (boot da máquina), a menos que você tenha dado `make down`.

## Depois de mudar o código

```bash
make rebuild   # rebuilda as imagens do back-end e do front-end e sobe a versão nova
```

As migrations novas rodam sozinhas: ao subir, o `back-end` aplica o que estiver
pendente antes de iniciar a API; se uma migration falhar, ele não fica saudável e
o front-end não sobe (`make logs S=back-end` mostra o erro). Faça um `make backup` antes de subir
uma versão com migration nova.

## Backups

```bash
make backup                                              # infra/backups/finance-manager-AAAAMMDD-HHMMSS.dump
make restore FILE=backups/finance-manager-20261117-103000.dump
```

- `backup` usa `pg_dump` em formato custom, confere o arquivo e mantém os
  `BACKUP_KEEP` mais recentes (padrão 14, no `.env`). Para agendar, um cron
  como `0 3 * * * make -C /caminho/para/financial/infra backup` basta.
- `restore` pede confirmação, faz antes um backup de segurança
  (`backups/pre-restore-*.dump`, fora da rotação), para back-end e front-end, recria o
  banco, restaura e sobe tudo de novo (aplicando migrations que o backup ainda
  não tinha).
- `infra/backups/` e `infra/.env` nunca são versionados. Copie os dumps para
  fora da máquina (disco externo, nuvem) — backup no mesmo disco não protege
  de perda do disco.
- Isto é backup do **banco inteiro**. O app também exporta/importa os dados do
  usuário em JSON pela tela de configurações (`/api/backup/export`).

## Configuração (`infra/.env`)

| Variável | Padrão | Observação |
| --- | --- | --- |
| `APP_PORT` | `8080` | Porta no host (sempre em `127.0.0.1`) |
| `APP_SECRET` | — | Obrigatória, ≥ 32 caracteres. Trocar encerra todas as sessões |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `finance` / — / `finance_manager` | Só valem na criação do volume; a senha só com letras e números |
| `ALLOW_SIGNUP` | `false` | Cadastro aberto além do primeiro usuário |
| `ACCESS_TOKEN_TTL_SECONDS` / `REFRESH_TOKEN_TTL_DAYS` | `900` / `7` | Duração das sessões |
| `BACKUP_KEEP` | `14` | Quantos dumps o `make backup` mantém |

Mudou o `.env`? `make up` recria os containers afetados.

## Portas

| Serviço | Porta | Publicada? |
| --- | --- | --- |
| front-end | 3000 no container → `127.0.0.1:${APP_PORT}` | sim, só loopback |
| back-end | 3001 | não (só o front-end fala com ele) |
| postgres | 5432 | não (use `docker exec -it postgres psql -U finance finance_manager`) |

Isto convive com o ambiente de desenvolvimento (`financial_postgres` em
`127.0.0.1:5435`, `next dev` em `:3000`, `nest start` em `:3001`): são
containers, volumes e portas diferentes.

## CI local

```bash
make ci   # ou scripts/ci-local.sh
```

Valida o compose, roda o shellcheck, builda as imagens, sobe um stack
descartável (projeto, porta e segredos próprios, sem ler o `.env`), faz smoke
tests pelo proxy do front-end (tela de entrada, health, cadastro, login, export e
import do backup), testa backup + restore e derruba tudo, volumes incluídos. Os
containers do CI ganham o prefixo `fm-ci-<pid>-`, então ele roda com a pilha real no ar.

## Apagar tudo

`make down` preserva os dados. Para apagar o banco de vez (irreversível):
`docker compose down --volumes` — faça um `make backup` antes.
