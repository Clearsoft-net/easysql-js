# @easysql/connector-clickhouse

ClickHouse connector for EasySQL — introspect a database locally and run queries
over the HTTP interface, keeping credentials on the machine. Works on Node.js 20+
and Bun.

Like every EasySQL connector, this is an **optional, opt-in package**: the API
client (`@easysql/client`) does not depend on it, so install only the engines you
actually use.

## Install

```bash
npm install @easysql/connector-clickhouse
# or
bun add @easysql/connector-clickhouse
```

## Usage

```ts
import { ClickhouseConnector } from "@easysql/connector-clickhouse";
import { generateSchema } from "@easysql/schema-generation";

const connector = new ClickhouseConnector({
  host: "127.0.0.1",
  port: 8123,        // default (8443 when ssl is true)
  user: "default",
  password: "",
  database: "analytics",
  ssl: false,        // default — https when true
});

await connector.connect();
try {
  const raw = await connector.introspect();      // local schema metadata
  const schema = generateSchema(raw);            // API payload — credentials never leave here
  console.log(schema.map((t) => t.name));

  const result = await connector.execute("SELECT id, email FROM users LIMIT 10");
  console.log(result.columns, result.rows, result.rowCount, result.durationMs);
} finally {
  await connector.close();
}
```

## API

| Member | Description |
|---|---|
| `new ClickhouseConnector(config)` | Validates and stores explicit configuration. |
| `connect()` | Opens the client (idempotent). |
| `close()` | Closes the client. |
| `introspect()` | Returns `RawSchema` from `system.tables` / `system.columns`. |
| `execute(sql)` | Runs a validated SQL statement, returns `QueryResult`. |

Configuration has documented defaults (`port` 8123 or 8443 with TLS,
`connectTimeoutMs` 10000). Credentials are held in memory only and are stripped
from every error message. No module-level state: several connectors can be open
at once.

ClickHouse has no foreign keys, so `foreign_key` is always `null`; `primary_key`
reflects the table's primary key, and `nullable` is derived from the
`Nullable(...)` type wrapper. `execute` does not validate SQL — pass statements
that the EasySQL API has already validated (SELECT-only).

## Integration test

```bash
EASYSQL_TEST_CLICKHOUSE_URL=clickhouse://default:@127.0.0.1:8123/easysql_test bun test
```

Skipped with an explicit message when the variable is not set.

## License

MIT — maintained by [Clearsoft](https://clearsoft.net).