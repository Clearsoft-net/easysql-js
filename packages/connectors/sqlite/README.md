# @easysql/connector-sqlite

SQLite connector for EasySQL — introspect a local database file (or an
in-memory database) and run queries. Uses Node's built-in `node:sqlite`, so the
package has no native dependency. Requires Node >= 22.5 or Bun >= 1.1.

## Install

```bash
npm install @easysql/connector-sqlite
# or
bun add @easysql/connector-sqlite
```

## Usage

```ts
import { SqliteConnector } from "@easysql/connector-sqlite";
import { generateSchema } from "@easysql/schema-generation";

const connector = new SqliteConnector({
  file: "/var/data/shop.db",
  readonly: true,     // default
});
connector.connect();
try {
  const raw = connector.introspect();            // local schema metadata
  const schema = generateSchema(raw);            // API payload
  console.log(schema.map((t) => t.name));

  const result = connector.execute("SELECT id, email FROM users LIMIT 10");
  console.log(result.columns, result.rows, result.rowCount, result.durationMs);
} finally {
  connector.close();
}
```

An in-memory database must be opened writable:

```ts
const connector = new SqliteConnector({ file: ":memory:", readonly: false });
```

## API

| Member | Description |
|---|---|
| `new SqliteConnector(config)` | Validates and stores configuration. |
| `connect()` | Opens the database (idempotent). |
| `close()` | Closes the database. |
| `introspect()` | Returns `RawSchema` from `sqlite_master` and `PRAGMA`. |
| `execute(sql)` | Runs a validated SQL statement, returns `QueryResult`. |

`readonly` defaults to `true`. The database is opened per connection and no
state survives it; several connectors can be open at once.

`execute` does not validate SQL — pass statements that the EasySQL API has
already validated (SELECT-only).

## License

MIT — maintained by [Clearsoft](https://clearsoft.net).
