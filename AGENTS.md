# AGENTS.md

Context for AI agents working on this repository. Read this first.

## What is this?

Bun-workspaces monorepo for the EasySQL TypeScript packages. One version and one
release per repository; generated code is kept strictly separate from hand-written code.

## Stack

| Layer | Choice |
|---|---|
| Runtime | Bun (scripts, tests, CI) |
| Language | TypeScript 5.5 (ES2022, ESM) |
| HTTP client | `openapi-fetch` |
| Type generation | `openapi-typescript` 7.x |
| Lint/format | Biome |
| Task runner | Makefile |
| Release | semantic-release (lockstep) |
| CI | GitHub Actions |

## Project structure

```
.
├── packages/
│   ├── client/                    # @easysql/client — GENERATED
│   │   ├── src/api-types.ts       # 🤖 openapi-typescript output
│   │   ├── src/client.ts          # 🤖 named methods from spec
│   │   ├── src/index.ts           # 🤖 generated re-exports
│   │   ├── scripts/generate.ts    # pipeline orchestrator (reads ../../../.env)
│   │   ├── scripts/client.ts.tpl  # generated-client template
│   │   ├── scripts/lib/*.ts       # extract / build / docs helpers
│   │   ├── tests/                 # client + generator unit tests
│   │   ├── package.json           # name, exports, publishConfig
│   │   └── tsconfig.json          # typecheck (src + scripts + tests)
│   │   └── tsconfig.build.json    # emit (src only)
│   ├── common/                    # @easysql/common — shared contracts + helpers
│   │   ├── src/types.ts           # every contract (RawSchema, Connector, ParsedConnection…)
│   │   ├── src/url.ts             # parseConnectionUrl() + mergeConnection()
│   │   ├── src/redact.ts          # sanitizeErrorMessage()
│   │   └── src/index.ts
│   ├── schema-generation/         # @easysql/schema-generation — hand-written, pure
│   │   ├── src/types.ts           # re-exports the shared schema contracts
│   │   ├── src/type-map.ts        # engine-native → SchemaType maps
│   │   ├── src/generate.ts        # generateSchema()
│   │   ├── tests/                 # fixtures (mysql, postgres/sqlite, clickhouse) + contract test
│   │   ├── package.json
│   │   └── tsconfig.json / tsconfig.build.json
│   └── connectors/                # @easysql/connectors — single package, opt-in drivers
│       ├── src/create-connector.ts # factory: lazy-loads the engine, calls its create()
│       ├── src/base-connector.ts   # BaseConnector (async) + SyncBaseConnector (sync) lifecycles
│       ├── src/internal.ts         # shared QueryResult assembly + redaction helpers
│       ├── src/helpers.ts          # shared SQL helpers (quoteIdent/quoteLiteral/columnKey)
│       ├── src/normalize.ts        # connection-string → explicit-fields helpers
│       ├── src/driver-loading.ts   # loadDriver(): missing driver → actionable error
│       ├── src/types.ts            # engine IDs, connection/option types, internal shapes
│       ├── src/mysql/              # MySQL/MariaDB introspection (mysql2)
│       ├── src/postgres/           # pg_catalog introspection (pg); session.ts adds
│       │                           #   Neon HTTP/WebSocket transports, queries.ts holds
│       │                           #   provider-safe catalog queries (Redshift)
│       ├── src/clickhouse/         # system tables over HTTP (@clickhouse/client)
│       ├── src/sqlite/             # sqlite_master/PRAGMA (node:sqlite)
│       ├── src/sqlserver/          # sys.* catalogs (mssql)
│       ├── src/oracle/             # ALL_*/USER_* dictionary views (oracledb, thin mode)
│       ├── src/firebird/           # RDB$ catalogs (node-firebird)
│       ├── src/db2/                # SYSCAT catalogs (ibm_db)
│       ├── src/duckdb/             # duckdb_tables()/duckdb_columns() (@duckdb/node-api)
│       ├── src/libsql/             # sqlite_master/PRAGMA over libSQL (@libsql/client)
│       ├── src/d1/                 # sqlite_master/PRAGMA over the D1 REST API (fetch)
│       ├── src/snowflake/          # INFORMATION_SCHEMA (snowflake-sdk)
│       ├── src/bigquery/           # dataset/table metadata (@google-cloud/bigquery)
│       ├── src/trino/              # information_schema (trino-client)
│       ├── src/hana/               # SYS.TABLES/SYS.TABLE_COLUMNS (@sap/hana-client)
│       └── tests/                  # unit, integration, and type tests
├── scripts/                       # lockstep release helpers (semantic-release exec)
├── .github/workflows/             # ci.yml, generate-sdk.yml, release.yml
├── biome.json
├── tsconfig.base.json
├── Makefile                       # help, install, generate, lint, typecheck, test, build, docs, check, all
├── .env.example                   # EASYSQL_API_URL (+ optional test credentials)
├── bun.lock
└── package.json                   # @easysql/sdk — private workspace root (aggregator)
```

`packages/connectors` is one publishable package, `@easysql/connectors`. Engine
implementations stay isolated in `src/<engine>/`; the public factory dynamically
loads only the selected implementation, so consumers install the EasySQL package
once plus the optional driver for the engine they use. Every third-party driver
is an **optional peer dependency** and a devDependency (for typecheck and tests).
SQLite uses Node's built-in `node:sqlite` (Node >=22.5) and Cloudflare D1 uses
`fetch`, so neither needs a driver. Direct connector classes are available via
package subpaths; prefer the factory for lazy loading and a stable entry point.

Implemented engines: MySQL/MariaDB, PostgreSQL, ClickHouse (HTTP interface),
SQLite, SQL Server, Oracle (thin mode), Firebird, Db2, DuckDB, libSQL/Turso,
Cloudflare D1, Snowflake, BigQuery, Trino and SAP HANA. **Redshift, CockroachDB
and Neon are providers of the PostgreSQL engine**, not separate engines: select
them with `provider`, and reach Neon over HTTP or WebSockets with `transport`.
`createConnector` accepts an engine and a typed connection value: a string is the
engine's conventional URL/DSN (or file path for SQLite/DuckDB), while object
forms carry explicit options (`host` implies TCP, `socket` implies a Unix socket).

Every engine shares one lifecycle. `src/base-connector.ts` provides
`BaseConnector` (async, for the network engines) and `SyncBaseConnector` (for the
synchronous `sqlite`); both own idempotent `connect`/`close`, the `execute`
template (timing + `QueryResult` assembly) and credential redaction, all built on
the pure helpers in `src/internal.ts`. An engine's `connector.ts` therefore
implements only its driver seams — `openHandle`/`closeHandle`/`runQuery` plus the
engine-specific `introspect` — and declares its catalog SQL in `queries.ts` and
its types (connection config, `IntrospectResult`, driver-row shapes) in
`types.ts`; the package-level `src/types.ts` holds the public engine IDs and
discriminated options, and `src/helpers.ts` holds the shared SQL helpers
(`quoteIdent`/`quoteLiteral`/`columnKey`).
`src/create-connector.ts` is a thin lazy-loading `switch`: each `case` loads the
engine module and calls the `create()` that its `index.ts` exports, so adding an
engine adds a single line there.

Adding an engine means: a `src/<engine>/{types,connector,index}.ts` triple (plus
`queries.ts` when it reads a system catalog) whose `connector.ts` extends
`BaseConnector`/`SyncBaseConnector` and whose `index.ts`
exports `create()`, a subpath export and optional peer/dev dependency in
`package.json`, a one-line `case` in `src/create-connector.ts`, an entry in
`src/types.ts` (engine const + options), a mapper in
`packages/schema-generation/src/type-map.ts` (the `ENGINE_MAPPERS` record is
exhaustive, so a missing mapper fails typecheck), the engine id in
`packages/common/src/types.ts` (`ConnectorEngine`) and its port plus URL scheme
in `packages/common/src/url.ts`, unit + integration tests, and the README table.
Introspection queries are written against each engine's documented system
catalogs and are only exercised end-to-end by the env-gated integration suites —
treat them as unverified until run against a live server. The root `packages/*`
workspace glob contains the consolidated package.

## Key files

| File | Role | Editable by hand? |
|---|---|---|
| `packages/client/src/*` | Generated API client (`paths`, `components`, client) | ❌ Generated by `make generate` / CI |
| `packages/client/scripts/*` | Generation pipeline | ✅ |
| `packages/*/src/types.ts` | Every type declaration of its directory (see Type placement) | ✅ |
| `packages/common/src/*` | Shared contracts + helpers (e.g. redaction) | ✅ |
| `packages/schema-generation/src/*` | Schema normalization (pure, no I/O) | ✅ |
| `packages/connectors/src/*` | Engine connectors and lazy factory (introspect + execute) | ✅ |
| `packages/*/tests/*` | Unit tests (bun test) | ✅ |
| `packages/*/package.json` | Per-package manifest (name, exports, deps) | ✅ |
| `packages/*/tsconfig.build.json` | Emit config (src only) | ✅ |
| `.github/workflows/*` | CI: checks, generation, release | ✅ |
| `scripts/release-*.mjs` | Lockstep release helpers | ✅ |

## Type placement

Every hand-written source directory declares its types in that directory's
`types.ts` — one file per directory, including types used only inside the package:

| `types.ts` | Holds |
|---|---|
| `packages/common/src/` | every contract: `RawSchema`, `TableSchema`/`ColumnSchema`, `SchemaType`, `Connector`, `QueryResult`, `ParsedConnection` |
| `packages/connectors/src/` | engine IDs, connection and factory option types, `NormalizedConnection` |
| `packages/connectors/src/<engine>/` | engine config (`MysqlConnectionConfig`), `IntrospectResult`, and the driver row shapes of that engine's queries |

Rules that make it work:

- No other module declares `interface`/`type`/`enum`; they `import type` from
  `./types.js`.
- `types.ts` exports everything so sibling modules can import it. **The public API
  is the `index.ts` barrels**, not `types.ts`: internal types
  (`NormalizedConnection`, `ColumnRow`) are marked *Internal* in their doc comment
  and are never re-exported from a barrel.
- Barrels (`index.ts`) only re-export; they never declare.
- Anonymous inline types (`Record<string, unknown>`, `{ table: string }`) stay where
  they are — the rule is about named declarations.
- `packages/connectors/src/types.ts` also carries the `ConnectorEngine` runtime
  const, because it is the source of the discriminated option types; its `satisfies`
  clause pins the values to `@easysql/common`'s engine vocabulary.
- Generated code is exempt: `packages/client/src/*` keeps the layout produced by
  `openapi-typescript` and `scripts/client.ts.tpl`, since CI regenerates it and fails
  on any diff. Tests and `packages/*/scripts/` may keep local fixture types.

## How to work on this

```bash
cp .env.example .env           # set EASYSQL_API_URL
make install                   # bun install --frozen-lockfile
make generate                  # download spec → packages/client/src
make check                     # lint + typecheck + tests, every package
make build                     # compile every package to dist/
```

Internal dependency rule: `packages/client` and `packages/common` depend on
nothing internal; `packages/schema-generation` and `packages/connectors`
depend on `@easysql/common` (contracts only — type-only). Connectors produce the
`RawSchema` that `@easysql/schema-generation` normalizes (see `generateSchema`).
Declare internal deps as workspaces (`"@easysql/common": "workspace:*"`), never
relative-path hacks.

## Public API

```typescript
import { createEasySQLClient } from "@easysql/client";

const api = createEasySQLClient({ baseUrl: "..." });
// or with auth:
const api = createEasySQLClient({ baseUrl: "...", accessToken: "..." });

const { data: tokens } = await api.refresh({ refresh_token: "..." });
const { data: user } = await api.me();
const { data: connections } = await api.listConnections();
const { data: result } = await api.createQuery({ connection_id: "...", question: "..." });
```

Schema normalization:

```typescript
import { generateSchema, type RawSchema } from "@easysql/schema-generation";

const schema = generateSchema(rawConnectorOutput); // TableSchema[]
```

Connectors are exposed through one package and factory; only the chosen
engine's module/driver is loaded:

```typescript
import { createConnector, ConnectorEngine } from "@easysql/connectors";

const connector = await createConnector({
  engine: ConnectorEngine.SQLite,
  connection: { file: "./shop.db", readonly: true },
});
await connector.connect();
const raw = await connector.introspect();
const result = await connector.execute("SELECT 1");
await connector.close();
```

Direct engine classes remain available from explicit subpaths such as
`@easysql/connectors/sqlite`; the factory is preferred for lazy loading.

## Endpoints

| Prefix | Methods | Paths |
|---|---|---|
| `/v1/auth` | GET, POST, PATCH, DELETE | refresh, me, logout, oidc/start, oidc/callback, oidc/complete |
| `/v1/api-keys` | GET, POST, DELETE | list, create, `/{key_id}` |
| `/v1/billing` | GET, POST | plan, usage, checkout, portal, webhook |
| `/v1/connections` | GET, POST, PATCH, DELETE | list, create, `/{id}`, sync, schema, suggestions, autocomplete |
| `/v1/queries` | GET, POST | list, create, `/{id}` |
| `/v1/feedbacks` | POST | create |
| `/v1/dashboard/stats` | GET | stats |
| `/v1/analytics/queries` | GET | query analytics |
| `/v1/flags` | GET | feature flags |
| `/v1/internal/email` | GET, POST | preview, test (dev-only) |
| `/health`, `/v1/health` | GET | health check |

## CI workflow

- **ci.yml** (pull_request, non-main pushes): jobs
  - `check` — `make check` (includes `verify:versions`, lint, typecheck, samples,
    tests) + `make build`.
  - `generated` — regenerates `packages/client` and fails on `git diff` (no
    manual edit survives regeneration).
  - `node-compat` — matrix Node 20/22/24, builds and runs
    `scripts/node-compat-smoke.mjs` (loads every package under Node).
  - `integration` — MySQL 8.4 + PostgreSQL 16 + ClickHouse 24.8 services; runs
    the connector integration tests (`EASYSQL_TEST_*_URL`). They create and drop
    their own `easysql_test_*` fixtures in the target database and assert the
    introspected metadata of those tables.
  - `coverage` — MySQL + PostgreSQL + ClickHouse services; `bun run coverage`
    enforces the line threshold (`COVERAGE_THRESHOLD`, default 80) over
    hand-written source only. Generated `packages/client/src` and codegen scripts
    are excluded, as are the `connector.ts` implementations of engines whose
    integration suites need a server this job does not start (their factory
    `create()` and `types.ts` stay in scope).
- **generate-sdk.yml** (repository_dispatch `generate-sdk` or workflow_dispatch):
  regenerate → check → build → open an `auto/generate-sdk` PR.
- **release.yml** (push main/master): check + build, then semantic-release.

Release is lockstep: `.releaserc.json` runs `scripts/release-prepare.mjs` (sets
the same version on the root and every package, rebuilds) and
`scripts/release-publish.mjs` (publishes every non-private package).

### npm publishing credentials

The `NPM_TOKEN` Actions secret is an npm **automation/publish token** named
`easysql-js` (account `joao-jlcm`) with read+write access to both the `@easysql`
and `@clearsoft` organizations. It **expires 2026-12-03** — rotate it before then
by creating a replacement with the same access and updating the secret:

```bash
gh secret set NPM_TOKEN --repo Clearsoft-net/easysql-js
```

Auth wiring per tool: `bun publish` reads `NPM_CONFIG_TOKEN`; `npm` (deprecate)
reads `NODE_AUTH_TOKEN` through `~/.npmrc`. Both workflows map the same secret.

## .env reference

| Variable | Used by | Required? |
|---|---|---|
| `EASYSQL_API_URL` | `packages/client/scripts/generate.ts`, CI | Yes |
| `EASYSQL_ACCESS_TOKEN` | samples / live checks (OIDC token) | No |
| `EASYSQL_REFRESH_TOKEN` | samples (rotated via `refresh()`) | No |
| `EASYSQL_CONNECTION_ID` | samples 11 and 16 | No |
| `EASYSQL_SQLITE_FILE` | sample 16 | No |
| `EASYSQL_TEST_MYSQL_URL` | mysql connector integration test | No |
| `EASYSQL_TEST_POSTGRES_URL` | postgres connector integration test | No |
| `EASYSQL_TEST_CLICKHOUSE_URL` | clickhouse connector integration test | No |
| `EASYSQL_TEST_SQLSERVER_URL` | sqlserver connector integration test | No |
| `EASYSQL_TEST_ORACLE_URL` | oracle connector integration test | No |
| `EASYSQL_TEST_FIREBIRD_URL` | firebird connector integration test | No |
| `EASYSQL_TEST_DB2_URL` | db2 connector integration test | No |
| `EASYSQL_TEST_DUCKDB_FILE` | duckdb integration test | No |
| `EASYSQL_TEST_LIBSQL_URL` / `_TOKEN` | libsql/Turso integration test | No |
| `EASYSQL_TEST_TRINO_URL` | trino connector integration test | No |
| `EASYSQL_TEST_HANA_URL` | SAP HANA connector integration test | No |
| `EASYSQL_TEST_SNOWFLAKE_URL` | snowflake connector integration test | No |
| `EASYSQL_TEST_BIGQUERY_PROJECT` / `_DATASET` | BigQuery integration test | No |
| `EASYSQL_TEST_D1_ACCOUNT_ID` / `_DATABASE_ID` / `_API_TOKEN` | Cloudflare D1 integration test | No |
