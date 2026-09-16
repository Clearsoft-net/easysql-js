# @easysql/connector-mysql

MySQL / MariaDB connector for EasySQL — introspect a database locally and run
queries, keeping credentials on the machine. Works on Node.js and Bun.

## Install

```bash
npm install @easysql/connector-mysql
# or
bun add @easysql/connector-mysql
```

## Usage

```ts
import { MysqlConnector } from "@easysql/connector-mysql";
import { generateSchema } from "@easysql/schema-generation";

const connector = new MysqlConnector({
  host: "127.0.0.1",
  port: 3306,        // default
  user: "readonly",
  password: "secret",
  database: "shop",
  ssl: false,        // default
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
| `new MysqlConnector(config)` | Validates and stores explicit configuration. |
| `connect()` | Opens the connection (idempotent). |
| `close()` | Closes the connection. |
| `introspect()` | Returns `RawSchema` from `information_schema`. |
| `execute(sql)` | Runs a validated SQL statement, returns `QueryResult`. |

Configuration has documented defaults (`port` 3306, `ssl` false,
`connectTimeoutMs` 10000). Credentials are held in memory only and are stripped
from every error message. No module-level state: several connectors can be open
at once.

`execute` does not validate SQL — pass statements that the EasySQL API has
already validated (SELECT-only).

## Integration test

```bash
EASYSQL_TEST_MYSQL_URL=mysql://user:pass@127.0.0.1:3306/easysql_test bun test
```

Skipped with an explicit message when the variable is not set.

## License

MIT — maintained by [Clearsoft](https://clearsoft.net).
