/**
 * Empty database and determinism guarantees.
 *
 *   bun run samples/03-schema-empty-and-determinism.ts
 */

import { generateSchema, type RawSchema } from "@easysql/schema-generation";
import { log } from "./_shared";

const empty = generateSchema({ engine: "mysql", tables: [] });
log("Empty database → empty payload", empty);

const raw: RawSchema = {
  engine: "sqlite",
  tables: [
    {
      name: "users",
      columns: [
        { name: "email", dataType: "TEXT", nullable: false, ordinal: 2 },
        { name: "id", dataType: "INTEGER", nullable: false, primaryKey: true, ordinal: 1 },
      ],
    },
  ],
};

const first = generateSchema(raw);
// Same input, tables reversed and columns shuffled: output must be identical.
const second = generateSchema({
  engine: "sqlite",
  tables: [...raw.tables].reverse().map((t) => ({ ...t, columns: [...t.columns].reverse() })),
});

log(
  "Column order follows ordinal (declared), not name",
  first[0]?.columns.map((c) => c.name),
);
log("Deterministic for the same database", JSON.stringify(first) === JSON.stringify(second));
