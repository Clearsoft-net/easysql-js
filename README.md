<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Clearsoft-net/easysql-brand/main/logo/01-dark-horizontal.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Clearsoft-net/easysql-brand/main/logo/02-light-horizontal.svg">
    <img alt="EasySQL Logo" src="https://raw.githubusercontent.com/Clearsoft-net/easysql-brand/main/logo/01-dark-horizontal.svg">
  </picture>
</p>

<h1 align="center">EasySQL TypeScript SDK</h1>

<p align="center">
  <strong>Official TypeScript/JavaScript SDK for the <a href="https://easysql.net">EasySQL API</a> · A <a href="https://clearsoft.net">Clearsoft</a> Product</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@clearsoft/easysql-sdk"><img src="https://img.shields.io/npm/v/@clearsoft/easysql-sdk?color=F97316&style=flat-square" alt="NPM Version"></a>
  <a href="https://github.com/Clearsoft-net/easysql-sdk-ts/actions"><img src="https://img.shields.io/github/actions/workflow/status/Clearsoft-net/easysql-sdk-ts/release.yml?branch=main&style=flat-square" alt="CI Status"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License"></a>
  <a href="https://easysql.net"><img src="https://img.shields.io/badge/Product-easysql.net-F97316?style=flat-square" alt="Website"></a>
  <a href="https://clearsoft.net"><img src="https://img.shields.io/badge/Company-clearsoft.net-0F2B3D?style=flat-square" alt="Company"></a>
</p>

---

Ask questions in natural language to your MySQL, MariaDB, or PostgreSQL databases directly from your TypeScript and Node.js/Bun applications.

## Installation

```bash
npm install @clearsoft/easysql-sdk
# or
bun add @clearsoft/easysql-sdk
# or
pnpm add @clearsoft/easysql-sdk
```

---

## Quick Start

```typescript
import { createEasySQLClient } from "@clearsoft/easysql-sdk";

const api = createEasySQLClient({
  baseUrl: "https://api.easysql.net",
  accessToken: "your-access-token",
});
```

### Authentication

```typescript
const api = createEasySQLClient({ baseUrl: "https://api.easysql.net" });

const { data: token, error } = await api.login({
  email: "user@example.com",
  password: "my-password",
});

if (error) throw new Error(`Login failed: ${error}`);

// Authenticated client instance
const authApi = createEasySQLClient({
  baseUrl: "https://api.easysql.net",
  accessToken: token.access_token,
});

const { data: user } = await authApi.me();
```

### Running Natural Language Queries

```typescript
// Ask questions in natural language
const { data: result } = await api.createQuery({
  connector_id: "conn_abc123",
  question: "How many users signed up this month?",
});

console.log(result?.sql);    // Generated SQL query
console.log(result?.result); // Execution rows

// List recent query history
const { data: history } = await api.listQueries({ page: 1, per_page: 10 });
```

### Managing Database Connectors

```typescript
// Create a connector
const { data: connector } = await api.createConnector({
  name: "Production DB",
  type: "mysql",
  config: {
    host: "db.example.com",
    port: 3306,
    database: "myapp",
    user: "readonly",
    password: "secret",
  },
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
| **Auth** | `register`, `login`, `refresh`, `me`, `deleteMe`, `updateMe`, `changePassword` |
| **Queries** | `createQuery`, `listQueries`, `getQuery` |
| **Connectors** | `listConnectors`, `createConnector`, `testConnector`, `getConnector`, `updateConnector`, `deleteConnector`, `syncConnector` |
| **Billing** | `getPlan`, `checkout`, `portal` |
| **Dashboard** | `dashboardStats` |
| **Health** | `health`, `healthV1` |

---

## Development & Contributing

Contributions are welcome! To run tests and build locally:

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
