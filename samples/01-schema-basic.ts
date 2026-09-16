/**
 * Normalize a raw introspection payload into the schema the API accepts.
 *
 * Pure and offline: no database, no network.
 *
 *   bun run samples/01-schema-basic.ts
 */

import { generateSchema, type RawSchema } from "@easysql/schema-generation";
import { log } from "./_shared";

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
          name: "is_active",
          dataType: "tinyint(1)",
          nullable: false,
          defaultValue: "1",
          ordinal: 3,
        },
        { name: "created_at", dataType: "timestamp", nullable: false, ordinal: 4 },
      ],
    },
    {
      name: "posts",
      rowsApprox: 128,
      columns: [
        { name: "id", dataType: "bigint", nullable: false, primaryKey: true, ordinal: 1 },
        {
          name: "user_id",
          dataType: "int",
          nullable: false,
          ordinal: 2,
          foreignKey: { table: "users", column: "id" },
        },
        { name: "title", dataType: "varchar(200)", nullable: false, ordinal: 3 },
      ],
    },
  ],
};

const schema = generateSchema(raw);
log("Canonical API schema", schema);
log(
  "Types mapped",
  schema.map((t) => `${t.name}: ${t.columns.map((c) => c.type).join(", ")}`),
);
