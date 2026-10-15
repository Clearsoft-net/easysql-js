<p align="center">
  <a href="https://easysql.net">
    <img alt="EasySQL Logo" src="https://raw.githubusercontent.com/Clearsoft-net/easysql-brand/main/logo/02-light-horizontal-bg.svg">
  </a>
</p>

<h1 align="center">EasySQL JavaScript & TypeScript SDK</h1>

<p align="center">
  <strong>Official JavaScript / TypeScript SDK for the <a href="https://easysql.net">EasySQL API</a> · A <a href="https://clearsoft.net">Clearsoft</a> Product</strong>
</p>

---

This repository (`@easysql/sdk`) is a [Bun workspaces](https://bun.sh/docs/install/workspaces)
multipackage repository. Everything is versioned and released together, one
version per repository.

## Packages

| Package | Directory | Source | Description |
|---|---|---|---|
| [`@easysql/client`](./packages/client) | `packages/client` | **Generated** | Typed client for the EasySQL API, generated from `/openapi.json`. |
| [`@easysql/common`](./packages/common) | `packages/common` | Hand-written | Shared contracts: schema shapes, connector interface, query result. |
| [`@easysql/query-builder`](./packages/query-builder) | `packages/query-builder` | Hand-written | Thin, SQL-first query builder with context-aware parameter binding, used by the connectors' catalog queries. |
| [`@easysql/schema-generation`](./packages/schema-generation) | `packages/schema-generation` | Hand-written | Normalizes introspected database metadata into the schema payload the API consumes. |
| [`@easysql/connectors`](./packages/connectors) | `packages/connectors` | Hand-written | Unified package for database connectors; engine modules and database drivers load on demand. |

The client package is written **only** by the codegen pipeline; nothing
hand-written lives inside it and no manual edit survives regeneration.

Each connector introspects its engine locally and returns the raw shape that
`@easysql/schema-generation` normalizes; credentials never leave the machine.
The unified connector package currently implements MySQL/MariaDB, PostgreSQL,
ClickHouse and SQLite. Additional engines and provider-specific transports are
planned and will be documented as supported after implementation and testing.

## Installation

```bash
npm install @easysql/client @easysql/connectors
# Install only the optional database driver packages you use:
npm install mysql2 pg @clickhouse/client
```

## Quick Start

```ts
import { createConnector, ConnectorEngine } from "@easysql/connectors";

const connector = await createConnector({
  engine: ConnectorEngine.PostgreSQL,
  connection: process.env.DATABASE_URL!,
});

try {
  const rawSchema = await connector.introspect();
  const result = await connector.execute("SELECT 1");
} finally {
  await connector.close();
}
```

See [`samples/`](./samples) for runnable examples and each package README for
more details.
