.PHONY: all build check clean coverage docs generate help install lint test typecheck

CYAN  := \033[36m
RESET := \033[0m

HELP_LINE      := ^[a-zA-Z_-]+:.*\#\# .*$$
HELP_DELIMITER := :.*\#\#

all: install generate check build ## Full pipeline (install → generate → check → build)

build: clean ## Compile TypeScript → dist/ (every package)
	bun run build

check: ## Lint + typecheck + tests (every package)
	bun run check

clean: ## Remove dist/ directories (every package)
	bun run clean

coverage: ## Run tests with coverage and enforce the threshold
	bun run coverage

docs: ## Generate API documentation (typedoc, api package)
	bun run docs

generate: ## Download API spec and regenerate packages/client/src
	bun run generate

help: ## Show this help
	@grep -E '$(HELP_LINE)' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = "$(HELP_DELIMITER) "}; {printf "$(CYAN)%-14s$(RESET) %s\n", $$1, $$2}'

install: ## Install dependencies (bun)
	bun install --frozen-lockfile

lint: ## Lint the workspace (biome)
	bun run lint

test: ## Run unit tests (bun test, every package)
	bun run test

typecheck: ## Check TypeScript types (no emit, every package)
	bun run typecheck
