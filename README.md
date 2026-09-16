<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Clearsoft-net/easysql-brand/main/logo/01-dark-horizontal.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Clearsoft-net/easysql-brand/main/logo/02-light-horizontal.svg">
    <img alt="EasySQL Logo" src="https://raw.githubusercontent.com/Clearsoft-net/easysql-brand/main/logo/01-dark-horizontal.svg">
  </picture>
</p>

<h1 align="center">EasySQL JavaScript & TypeScript SDK</h1>

<p align="center">
  <strong>Official JavaScript / TypeScript packages for the <a href="https://easysql.net">EasySQL API</a> · A <a href="https://clearsoft.net">Clearsoft</a> Product</strong>
</p>

<p align="center">
  <a href="https://github.com/Clearsoft-net/easysql-js/actions"><img src="https://img.shields.io/github/actions/workflow/status/Clearsoft-net/easysql-js/release.yml?branch=main&style=flat-square" alt="CI Status"></a>
  <a href="https://github.com/Clearsoft-net/easysql-js/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  <a href="https://easysql.net"><img src="https://img.shields.io/badge/Product-easysql.net-F97316?style=flat-square" alt="Website"></a>
  <a href="https://clearsoft.net"><img src="https://img.shields.io/badge/Company-clearsoft.net-0F2B3D?style=flat-square" alt="Company"></a>
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
| [`@easysql/schema-generation`](./packages/schema-generation) | `packages/schema-generation` | Hand-written | Normalizes introspected database metadata into the schema payload the API consumes. |
| [`@easysql/connector-mysql`](./packages/connectors/mysql) | `packages/connectors/mysql` | Hand-written | MySQL / MariaDB introspection and query execution. |
| [`@easysql/connector-postgres`](./packages/connectors/postgres) | `packages/connectors/postgres` | Hand-written | PostgreSQL introspection and query execution. |
| [`@easysql/connector-sqlite`](./packages/connectors/sqlite) | `packages/connectors/sqlite` | Hand-written | SQLite introspection and query execution (`node:sqlite`). |

The client package is written **only** by the codegen pipeline; nothing
hand-written lives inside it and no manual edit survives regeneration.

Each connector introspects its engine locally and returns the raw shape that
`@easysql/schema-generation` normalizes; credentials never leave the machine.
The Neon and Cloudflare D1 connectors are tracked separately (EZSQL-60).

## Installation

```bash
npm install @easysql/client
# or
bun add @easysql/client
```

## Quick Start

```typescript
import { createEasySQLClient } from "@easysql/client";

const api = createEasySQLClient({
  baseUrl: "https://api.easysql.net",
  accessToken: "your-access-token",
});
```

See [`packages/client/README.md`](./packages/client/README.md) for authentication,
query and connector examples.

## Migration from the single-package SDK

The previous single package `@clearsoft/easysql-sdk` was split:

| Before | After |
|---|---|
| `@clearsoft/easysql-sdk` | `@easysql/client` (same API surface) |

Consumers only change the package they require and the import path; the
generated types and the `createEasySQLClient` wrapper are unchanged.

## Development

```bash
cp .env.example .env   # configure the API URL used by `make generate`
make install           # install workspace dependencies
make generate          # download the OpenAPI spec → regenerate packages/client
make check             # lint + typecheck + tests, every package
make build             # compile every package to dist/
```

Other targets: `make lint`, `make typecheck`, `make test`, `make docs`,
`make clean`, `make all`. Run `make help` for the full list.

Runnable examples for every package live in [`samples/`](./samples) — start with
`bun run samples/01-schema-basic.ts`.

## License

This project is open source and licensed under the [MIT License](./LICENSE).

Maintained by **[Clearsoft](https://clearsoft.net)**.
