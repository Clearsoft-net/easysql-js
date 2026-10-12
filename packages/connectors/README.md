# @easysql/connectors

Database connectors for EasySQL, distributed as one package. Database modules
and drivers are loaded on demand; install the optional driver package for each
engine you use.

## Install

```sh
npm install @easysql/connectors
# Add only the optional driver for your engine:
npm install mysql2                 # MySQL / MariaDB
# npm install pg                   # PostgreSQL
# npm install @clickhouse/client   # ClickHouse
```

SQLite uses Node's built-in `node:sqlite` (Node >= 22.5) and does not need a
third-party driver. Bun support depends on its implementation of `node:sqlite`.

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

Connections may be passed as a native URL/DSN string where supported by the
engine driver, or as an engine-specific object. Examples:

```ts
// MySQL TCP
await createConnector({
  engine: ConnectorEngine.MySQL,
  connection: { host: "127.0.0.1", user: "reader", password: "secret", database: "shop" },
});

// MySQL Unix socket
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

| Engine | Current connection support | Optional driver |
|---|---|---|
| MySQL / MariaDB | TCP or Unix socket; URL parsing in factory | `mysql2` |
| PostgreSQL | TCP or Unix socket; URL parsing in factory | `pg` |
| ClickHouse | HTTP(S) | `@clickhouse/client` |
| SQLite | File or `:memory:` | Node `node:sqlite` |

`@easysql/connectors` currently implements these four engines. Additional engines
and provider-specific transports (including Neon HTTP/WebSocket) are planned,
not yet implemented. The public API will only advertise an engine/transport as
supported after its implementation and tests are in place.

## Tests

```sh
bun test
```

Integration tests run when the corresponding `EASYSQL_TEST_*_URL` environment
variable is set. Unit tests do not require database servers.
