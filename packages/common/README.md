# @easysql/common

Shared contracts (types and interfaces) and small shared helpers for the
EasySQL TypeScript SDK. The only runtime export is `sanitizeErrorMessage`.

## Install

```bash
npm install @easysql/common
# or
bun add @easysql/common
```

## What it defines

### Schema contracts

| Type | Role |
|---|---|
| `RawColumn` / `RawTable` / `RawSchema` | What a connector produces from a local database (engine-native types, PK/FK, `ordinal`). |
| `ColumnSchema` / `TableSchema` | The schema payload the EasySQL API accepts. |
| `ConnectorEngine` | `"mysql" \| "mariadb" \| "sqlite" \| "postgresql"`. |
| `SchemaType` | Canonical type vocabulary (`integer`, `string`, `timestamp`, ...). |

### Connector contract

```ts
import type { Connector, QueryResult } from "@easysql/common";

// Every @easysql/connector-* class implements this interface:
interface Connector {
  connect(): void | Promise<void>;
  close(): void | Promise<void>;
  introspect(): RawSchema | Promise<RawSchema>;
  execute(sql: string): QueryResult | Promise<QueryResult>;
}
```

`QueryResult` is `{ columns, rows, rowCount, durationMs }`.

## Usage

```ts
import type { Connector, RawSchema, SchemaType } from "@easysql/common";
import { generateSchema } from "@easysql/schema-generation";

function toPayload(connector: Connector): Promise<ReturnType<typeof generateSchema>> {
  return Promise.resolve(connector.introspect()).then(generateSchema);
}
```

`@easysql/schema-generation` and every connector package depend on these
contracts; `@easysql/schema-generation` also re-exports the schema types for
convenience.

## License

MIT — maintained by [Clearsoft](https://clearsoft.net).
