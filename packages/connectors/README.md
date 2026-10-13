# @easysql/connectors

Database connectors for EasySQL, distributed as one package. Engine modules and
their drivers are loaded on demand, so installing this package never pulls in
every database driver: install only the optional driver for the engine you use.

## Install

```sh
npm install @easysql/connectors
# Then add only the driver for your engine, for example:
npm install mysql2                 # MySQL / MariaDB
npm install pg                     # PostgreSQL, Redshift, CockroachDB, Neon (TCP)
npm install @clickhouse/client     # ClickHouse
npm install mssql                  # SQL Server
npm install oracledb               # Oracle
npm install node-firebird          # Firebird
npm install ibm_db                 # IBM Db2
npm install @duckdb/node-api       # DuckDB
npm install @libsql/client         # libSQL / Turso
npm install snowflake-sdk          # Snowflake
npm install @google-cloud/bigquery # BigQuery
npm install trino-client           # Trino
npm install @sap/hana-client       # SAP HANA
npm install @neondatabase/serverless # Neon over HTTP / WebSockets
```

SQLite uses Node's built-in `node:sqlite` (Node >= 22.5) and Cloudflare D1 is
reached over its REST API with `fetch`, so neither needs a third-party driver.

## Factory API

```ts
import { createConnector, ConnectorEngine } from "@easysql/connectors";

const connector = await createConnector({
  engine: ConnectorEngine.PostgreSQL,
  connection: process.env.DATABASE_URL!,
});

try {
  const schema = await connector.introspect();
  const result = await connector.execute("SELECT 1");
} finally {
  await connector.close();
}
```

A string in `connection` is the engine's conventional URL/DSN (or a file path for
SQLite/DuckDB). An object carries explicit options; `host` implies TCP and
`socket` implies a Unix socket.

```ts
// MySQL over TCP
await createConnector({
  engine: ConnectorEngine.MySQL,
  connection: { host: "127.0.0.1", user: "reader", password: "secret", database: "shop" },
});

// MySQL over a Unix socket
await createConnector({
  engine: ConnectorEngine.MySQL,
  connection: { socket: "/var/run/mysqld/mysqld.sock", user: "reader", password: "secret", database: "shop" },
});

// SQLite file
await createConnector({
  engine: ConnectorEngine.SQLite,
  connection: { file: "./shop.db", readonly: true },
});
```

Direct engine classes and their options are available through package subpaths,
for example `@easysql/connectors/mysql`. Prefer `createConnector` for lazy,
unified setup.

## Implemented engines

| Engine | Connection support | Optional driver |
|---|---|---|
| MySQL / MariaDB | TCP, Unix socket, URL | `mysql2` |
| PostgreSQL | TCP, Unix socket, URL | `pg` |
| ClickHouse | HTTP(S) | `@clickhouse/client` |
| SQLite | File, `:memory:` | Node `node:sqlite` |
| SQL Server | TCP, URL | `mssql` |
| Oracle | TCP, Easy Connect string, URL | `oracledb` (Thin mode) |
| Firebird | TCP, URL | `node-firebird` |
| IBM Db2 | TCP, URL | `ibm_db` |
| DuckDB | File, `:memory:` | `@duckdb/node-api` |
| libSQL / Turso | `libsql://`, `https://`, `file:` | `@libsql/client` |
| Cloudflare D1 | REST API (account + database + token) | none (`fetch`) |
| Snowflake | Account + credentials | `snowflake-sdk` |
| BigQuery | Project + dataset | `@google-cloud/bigquery` |
| Trino | TCP/HTTP(S) + catalog | `trino-client` |
| SAP HANA | TCP, URL | `@sap/hana-client` |

### PostgreSQL providers and transports

Redshift, CockroachDB and Neon are **providers of the PostgreSQL engine**, not
separate engines — the SQL dialect and catalog stay PostgreSQL. Select them with
`provider`, and the transport with `transport`:

```ts
// Neon over HTTP (one-shot queries; needs @neondatabase/serverless)
await createConnector({
  engine: ConnectorEngine.PostgreSQL,
  provider: "neon",
  transport: "http",
  connection: process.env.DATABASE_URL!,
});

// Neon over WebSockets (sessions, interactive transactions)
await createConnector({
  engine: ConnectorEngine.PostgreSQL,
  provider: "neon",
  transport: "websocket",
  connection: process.env.DATABASE_URL!,
});

// Amazon Redshift (provider-specific catalog queries)
await createConnector({
  engine: ConnectorEngine.PostgreSQL,
  provider: "redshift",
  connection: process.env.REDSHIFT_URL!,
});
```

Redshift is based on PostgreSQL 8.0, so it lacks `pg_class.relispartition`; the
connector selects a version-safe introspection query for that provider.

## Tests

```sh
bun test
```

Integration tests run only when the matching `EASYSQL_TEST_*` environment
variable is set (for example `EASYSQL_TEST_SQLSERVER_URL`). Unit tests need no
database server. Introspection queries are written against each engine's
documented system catalogs; they are exercised end-to-end only by the
integration suites.
