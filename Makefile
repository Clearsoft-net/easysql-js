.PHONY: all build clean generate help install test typecheck

CYAN  := \033[36m
RESET := \033[0m

HELP_LINE      := ^[a-zA-Z_-]+:.*\#\# .*$$
HELP_DELIMITER := :.*\#\#

all: install generate typecheck build ## Full pipeline (install → generate → typecheck → build)

build: clean ## Compile TypeScript → dist/
	bun run build

clean: ## Remove dist/ directory
	rm -rf dist

generate: ## Download API spec and generate src/api-types.ts
	bun run generate

help: ## Show this help
	@grep -E '$(HELP_LINE)' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = "$(HELP_DELIMITER) "}; {printf "$(CYAN)%-14s$(RESET) %s\n", $$1, $$2}'

install: ## Install dependencies (bun)
	bun install --frozen-lockfile

test: ## Run smoke test against the API
	bun run src/test.ts

typecheck: ## Check TypeScript types (no emit)
	bun run typecheck
