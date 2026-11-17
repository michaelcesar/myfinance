# =============================================================================
# Finance Manager — comandos do stack local
# =============================================================================
# Rode de dentro de infra/ (ou com `make -C infra <alvo>`). `make help` lista
# os alvos. Tudo passa pelo docker compose deste diretório, que lê infra/.env.

SHELL := /usr/bin/env bash
.SHELLFLAGS := -euo pipefail -c
.DEFAULT_GOAL := help

COMPOSE := docker compose --project-directory $(CURDIR) -f $(CURDIR)/docker-compose.yml

.PHONY: help setup up down restart logs ps rebuild backup restore config ci check-env

help: ## Lista os alvos
	@grep -hE '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  make %-10s %s\n", $$1, $$2}'

setup: ## Primeira vez: cria infra/.env com segredos novos (não sobrescreve)
	@scripts/setup.sh

check-env:
	@test -f .env || { echo "infra/.env não existe. Rode primeiro: make setup"; exit 1; }

up: check-env ## Sobe o stack (builda as imagens que faltarem) e espera ficar saudável
	$(COMPOSE) up -d --wait
	@echo "Finance Manager no ar: http://localhost:$$(grep -E '^APP_PORT=' .env | cut -d= -f2 | grep . || echo 8080)"

down: ## Para e remove os containers (os dados ficam no volume)
	$(COMPOSE) down

restart: check-env ## Reinicia back-end e front-end (sem rebuild)
	$(COMPOSE) restart back-end front-end

logs: ## Acompanha os logs (make logs S=back-end para um serviço só)
	$(COMPOSE) logs -f --tail=200 $(S)

ps: ## Estado e saúde dos containers
	$(COMPOSE) ps -a

rebuild: check-env ## Depois de mudar o código: rebuilda as imagens e sobe a versão nova
	$(COMPOSE) build --pull
	$(COMPOSE) up -d --wait
	@echo "Imagens antigas sem uso podem ser removidas com: docker image prune"

backup: ## Dump do banco em infra/backups/ (mantém os BACKUP_KEEP mais recentes)
	@scripts/backup-db.sh

restore: ## Restaura um dump: make restore FILE=backups/finance-manager-....dump
	@test -n "$(FILE)" || { echo "Uso: make restore FILE=backups/<arquivo>.dump"; exit 2; }
	@scripts/restore-db.sh "$(FILE)"

config: check-env ## Valida o docker-compose.yml com o infra/.env atual
	$(COMPOSE) config -q && echo "docker-compose.yml válido."

ci: ## CI local do stack: valida, builda, sobe um stack descartável e testa
	@scripts/ci-local.sh
