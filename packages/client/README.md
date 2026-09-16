<p align="center">
  <a href="https://easysql.net">
    <img alt="EasySQL Logo" src="https://raw.githubusercontent.com/Clearsoft-net/easysql-brand/main/logo/02-light-horizontal-bg.svg">
  </a>
</p>

<h1 align="center">EasySQL JavaScript & TypeScript SDK</h1>

<p align="center">
  <strong>Official JavaScript / TypeScript SDK for the <a href="https://easysql.net">EasySQL API</a> · A <a href="https://clearsoft.net">Clearsoft</a> Product</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@easysql/client"><img src="https://img.shields.io/npm/v/@easysql/client?color=F97316&style=flat-square" alt="NPM Version"></a>
  <a href="https://github.com/Clearsoft-net/easysql-js/actions"><img src="https://img.shields.io/github/actions/workflow/status/Clearsoft-net/easysql-js/release.yml?branch=main&style=flat-square" alt="CI Status"></a>
  <a href="https://github.com/Clearsoft-net/easysql-js/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  <a href="https://easysql.net"><img src="https://img.shields.io/badge/Product-easysql.net-F97316?style=flat-square" alt="Website"></a>
  <a href="https://clearsoft.net"><img src="https://img.shields.io/badge/Company-clearsoft.net-0F2B3D?style=flat-square" alt="Company"></a>
</p>

---

Ask questions in natural language to your MySQL, MariaDB, or PostgreSQL databases directly from your JavaScript and TypeScript applications (Node.js, Bun, Deno, and modern browser runtimes).

## Installation

```bash
npm install @easysql/client
# or
bun add @easysql/client
# or
pnpm add @easysql/client
```

---

## Quick Start

```typescript
import { createEasySQLClient } from "@easysql/client";

const api = createEasySQLClient({
  baseUrl: "https://api.easysql.net",
  accessToken: "your-access-token",
});
```

### Authentication

Authentication is **OIDC-only** — there is no password login endpoint. Obtain
tokens from the sign-in flow (`oidcStart` / `oidcCallback` / `oidcComplete`), or
rotate an existing pair with `refresh`:

```typescript
// Rotate an existing refresh token into a fresh access token
const api = createEasySQLClient({ baseUrl: "https://api.easysql.net" });

const { data: tokens, error } = await api.refresh({
  refresh_token: "your-refresh-token",
});
if (error) throw new Error(`Refresh failed: ${JSON.stringify(error)}`);

const authApi = createEasySQLClient({
  baseUrl: "https://api.easysql.net",
  accessToken: tokens.access_token,
});
const { data: user } = await authApi.me();
```

Machine clients authenticate with an API key (see `createApiKey`) by sending it
as the bearer token.

### Running Natural Language Queries

The API generates the SQL; a client runtime executes it locally against the
customer database (credentials never reach the API) and posts the rows back.

```typescript
const { data: query } = await api.createQuery({
  connector_id: "conn_abc123",
  question: "How many users signed up this month?",
});

console.log(query?.sql_generated);        // Generated SQL
console.log(query?.needs_local_execution); // true — run it locally

// Execute locally (see @easysql/connector-*), then submit the rows:
await api.answerQuery(
  { result_data: rows },
  { path: { query_id: query.id } },
);

// List recent query history
const { data: history } = await api.listQueries({ page: 1, per_page: 10 });
```

See [`samples/`](../../samples) for runnable, end-to-end examples.

### Managing Database Connectors

```typescript
// Create a connector (schema-only: introspect locally, push only the schema)
const { data: connector } = await api.createConnector({
  name: "Production DB",
  type: "mysql",
  schema: [
    {
      name: "users",
      columns: [
        { name: "id", type: "int", nullable: false, primary_key: true },
        { name: "email", type: "varchar", nullable: false },
      ],
    },
  ],
});

// List connectors
const { data: connectors } = await api.listConnectors();

// Get connector details
const { data: conn } = await api.getConnector({ connector_id: "abc-123" });

// Update a connector
const { data: updated } = await api.updateConnector(
  { name: "Staging DB" },
  { path: { connector_id: "abc-123" } },
);

// Delete a connector
await api.deleteConnector({ connector_id: "abc-123" });
```

### Dashboard & Analytics

```typescript
const { data: stats } = await api.dashboardStats();
```

---

## API Overview

| Module | Available Methods |
|---|---|
| **Auth** | `refresh`, `me`, `updateMe`, `deleteMe`, `logout`, `oidcStart`, `oidcCallback`, `oidcComplete` |
| **API keys** | `listApiKeys`, `createApiKey`, `deleteApiKey` |
| **Queries** | `createQuery`, `listQueries`, `getQuery`, `answerQuery`, `streamQuery` |
| **Connectors** | `listConnectors`, `createConnector`, `getConnector`, `updateConnector`, `deleteConnector`, `syncConnector`, `getConnectorSchema`, `getSuggestions`, `autocomplete` |
| **Feedback** | `getFeedback`, `upsertFeedback`, `deleteFeedback` |
| **Billing** | `getPlan`, `getUsage`, `checkout`, `portal` |
| **Dashboard** | `dashboardStats` |
| **Health** | `health`, `healthHealth` |

---

## Development & Contributing

Contributions are welcome! Please read our **[Contributing Guidelines](https://github.com/Clearsoft-net/easysql-js/blob/main/CONTRIBUTING.md)** for details on the development workflow, testing, and pull request process.

To run tests and build locally:

```bash
cp .env.example .env                 # configure API URL
make install                          # install dependencies
make generate                         # download OpenAPI spec -> regenerate client
make typecheck                        # run TypeScript checks
make test                             # run test suite
make build                            # compile to dist/
```

---

## License

This project is open source and licensed under the [MIT License](./LICENSE).

Maintained by **[Clearsoft](https://clearsoft.net)**.
