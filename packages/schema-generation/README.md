# @easysql/schema-generation

Normalize the raw metadata a database connector introspects into the schema
payload the [EasySQL API](https://easysql.net) consumes.

Pure and deterministic: this package performs **no** network, filesystem or
database access. It takes the single input shape connectors produce and returns
the `TableSchema[]` accepted by `POST /v1/connectors` and
`POST /v1/connectors/:id/sync`.

## Install

```bash
npm install @easysql/schema-generation
# or
bun add @easysql/schema-generation
```

## Usage

```ts
import { generateSchema, type RawSchema } from "@easysql/schema-generation";

const raw: RawSchema = {
  engine: "mysql",
  tables: [
    {
      name: "users",
      rowsApprox: 42,
      columns: [
        { name: "id", dataType: "int", nullable: false, primaryKey: true, ordinal: 1 },
        { name: "email", dataType: "varchar(255)", nullable: false, ordinal: 2 },
        {
          name: "role_id",
          dataType: "int",
          nullable: true,
          ordinal: 3,
          foreignKey: { table: "roles", column: "id" },
        },
      ],
    },
  ],
};

const schema = generateSchema(raw);
// [{ name: "users", rows_approx: 42, columns: [
//   { name: "id",    type: "integer", nullable: false, primary_key: true,  default: null, foreign_key: null },
//   { name: "email", type: "string",  nullable: false, primary_key: false, default: null, foreign_key: null },
//   { name: "role_id", type: "integer", nullable: true, primary_key: false, default: null,
//     foreign_key: { table: "roles", column: "id" } },
// ] }]
```

## Input contract

Connectors report one `RawSchema` per introspected database:

| Type | Field | Notes |
|---|---|---|
| `RawSchema` | `engine` | `"mysql" \| "mariadb" \| "sqlite"` |
| `RawSchema` | `tables` | `RawTable[]` |
| `RawTable` | `name`, `columns`, `rowsApprox?` | |
| `RawColumn` | `name`, `dataType`, `nullable` | `dataType` is the engine-native declared type |
| `RawColumn` | `defaultValue?`, `primaryKey?`, `foreignKey?` | |
| `RawColumn` | `ordinal?` | Declared position; keeps column order stable |

## Output and determinism

- Tables are sorted by name and columns keep their declared order (or name
  order when the connector does not report an ordinal) — the same database
  always produces an identical payload, independent of the host locale.
- Engine types are mapped into a closed vocabulary (`SchemaType`): `integer`,
  `bigint`, `smallint`, `decimal`, `float`, `boolean`, `string`, `text`,
  `binary`, `blob`, `date`, `time`, `datetime`, `timestamp`, `json`, `enum`,
  `uuid`, `unknown`. Unmapped types fall back to `unknown` so downstream
  consumers never depend on engine-specific spellings.
- MySQL/MariaDB types are mapped by name (`tinyint(1)` → `boolean`).
- SQLite declared types are resolved by affinity first, then refined by named
  types (`BOOLEAN`, `DATETIME`, `DATE`, `JSON`, `UUID`).

## License

MIT — maintained by [Clearsoft](https://clearsoft.net).
