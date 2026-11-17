# =============================================================================
# Finance Manager: commands for the local stack
# =============================================================================
# Run from infra/ (or with `make -C infra <target>`). `make help` lists the
# targets. Everything goes through the docker compose file in this directory,
# which reads infra/.env.

SHELL := /usr/bin/env bash
.SHELLFLAGS := -euo pipefail -c
.DEFAULT_GOAL := help

COMPOSE := docker compose --project-directory $(CURDIR) -f $(CURDIR)/docker-compose.yml

.PHONY: help setup up down restart logs ps rebuild backup restore config ci check-env

help: ## List the targets
	@grep -hE '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  make %-10s %s\n", $$1, $$2}'

setup: ## First run: create infra/.env with fresh secrets (never overwrites)
	@scripts/setup.sh

check-env:
	@test -f .env || { echo "infra/.env does not exist. Run first: make setup"; exit 1; }

up: check-env ## Start the stack (builds missing images) and wait until healthy
	$(COMPOSE) up -d --wait
	@echo "Finance Manager is up: http://localhost:$$(grep -E '^APP_PORT=' .env | cut -d= -f2 | grep . || echo 8080)"

down: ## Stop and remove the containers (data stays in the volume)
	$(COMPOSE) down

restart: check-env ## Restart back-end and front-end (no rebuild)
	$(COMPOSE) restart back-end front-end

logs: ## Follow the logs (make logs S=back-end for a single service)
	$(COMPOSE) logs -f --tail=200 $(S)

ps: ## Container status and health
	$(COMPOSE) ps -a

rebuild: check-env ## After a code change: rebuild the images and start the new version
	$(COMPOSE) build --pull
	$(COMPOSE) up -d --wait
	@echo "Unused old images can be removed with: docker image prune"

backup: ## Dump the database to infra/backups/ (keeps the newest BACKUP_KEEP)
	@scripts/backup-db.sh

restore: ## Restore a dump: make restore FILE=backups/finance-manager-....dump
	@test -n "$(FILE)" || { echo "Usage: make restore FILE=backups/<file>.dump"; exit 2; }
	@scripts/restore-db.sh "$(FILE)"

config: check-env ## Validate docker-compose.yml against the current infra/.env
	$(COMPOSE) config -q && echo "docker-compose.yml is valid."

ci: ## Local CI: validate, build, start a throwaway stack and test it
	@scripts/ci-local.sh
