# Samples

Runnable examples for the EasySQL TypeScript SDK. Each file is standalone — run
one with `bun run` (or `npx tsx`) from the repository root.

```bash
bun install
bun run samples/01-schema-basic.ts
```

Offline samples (01–06) need no configuration. Client/API samples need a token:

```bash
cp .env.example .env
# edit .env: EASYSQL_ACCESS_TOKEN (or EASYSQL_REFRESH_TOKEN)
bun run samples/09-client-list-connectors.ts
```

## Schema normalization (`@easysql/schema-generation`)

| Sample | Shows |
|---|---|
| `01-schema-basic.ts` | Raw introspection → API schema payload. |
| `02-schema-type-mapping.ts` | MySQL/PostgreSQL/SQLite type → canonical type. |
| `03-schema-empty-and-determinism.ts` | Empty DB + stable ordering. |

## SQLite connector (`@easysql/connector-sqlite`)

| Sample | Shows |
|---|---|
| `04-sqlite-introspect.ts` | In-memory DB → `introspect()` → `generateSchema()`. |
| `05-sqlite-execute.ts` | Run a query, read rows/columns/duration. |
| `06-sqlite-readonly-file.ts` | Read-only file; writes rejected. |

## API client (`@easysql/client`)

| Sample | Shows |
|---|---|
| `07-client-health.ts` | Health check (no auth). |
| `08-client-auth-me.ts` | Auth (OIDC token / refresh) + `me()` + API keys. |
| `09-client-list-connectors.ts` | List connectors and read a stored schema. |
| `10-client-create-connector-from-sqlite.ts` | Introspect locally and register it. |
| `11-client-natural-query.ts` | NL question + poll result. |
| `12-client-api-keys.ts` | Create / list / delete an API key. |
| `13-client-dashboard-billing.ts` | Dashboard stats + plan + usage. |

## MySQL / PostgreSQL / ClickHouse connectors

| Sample | Shows |
|---|---|
| `14-mysql-introspect.ts` | Introspect a MySQL/MariaDB database. |
| `15-postgres-introspect.ts` | Introspect PostgreSQL and run a query. |
| `16-full-local-execution.ts` | Full flow: introspect → ask → execute locally → answer. |
| `17-clickhouse-introspect.ts` | Introspect a ClickHouse database. |

## Environment

| Variable | Used by |
|---|---|
| `EASYSQL_API_URL` | All API samples (defaults to `https://api.easysql.net`) |
| `EASYSQL_ACCESS_TOKEN` / `EASYSQL_REFRESH_TOKEN` | API samples |
| `EASYSQL_CONNECTOR_ID` | Samples 11 and 16 |
| `EASYSQL_SQLITE_FILE` | Sample 16 |
| `EASYSQL_TEST_MYSQL_URL` | Sample 14 (or pass a URL as argv) |
| `EASYSQL_TEST_POSTGRES_URL` | Sample 15 (or pass a URL as argv) |
| `EASYSQL_TEST_CLICKHOUSE_URL` | Sample 17 (or pass a URL as argv) |
