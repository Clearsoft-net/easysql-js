/**
 * Catalog queries for Oracle Database.
 *
 * The `ALL_*` data-dictionary views describe every object the connected user can
 * see, so each query is scoped to the session's current schema (resolved with
 * `SYS_CONTEXT`) rather than a hard-coded owner. Recycle-bin, nested and
 * secondary (domain index) tables are excluded from the table listing.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { eq, expr, select } from "@easysql/query-builder";

/** Metadata name of the schema the session is currently resolving names in. */
const CURRENT_SCHEMA = expr("SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA')");

/**
 * Base tables owned by the current schema. `NUM_ROWS` comes from optimizer
 * statistics, so it is `NULL` until the table has been analysed and may be
 * stale afterwards. Recycle-bin, nested and secondary (domain index) tables are
 * excluded. Aliases are quoted so the object keys keep their exact case.
 */
export function tablesQuery(): CompiledQuery {
  return select({ table_name: "t.TABLE_NAME", rows_approx: "t.NUM_ROWS" })
    .from("ALL_TABLES t")
    .where("t.OWNER", CURRENT_SCHEMA)
    .where("t.NESTED", "NO")
    .where("t.SECONDARY", "NO")
    .where(expr("t.TABLE_NAME NOT LIKE 'BIN$%'"))
    .orderBy("t.TABLE_NAME")
    .compile("literal", { aliasQuote: '"' });
}

/** Every visible column of the current schema, batched (no per-table query). */
export function columnsQuery(): CompiledQuery {
  return select({
    table_name: "c.TABLE_NAME",
    column_name: "c.COLUMN_NAME",
    data_type: "c.DATA_TYPE",
    nullable: "c.NULLABLE",
    data_default: "c.DATA_DEFAULT",
    column_id: "c.COLUMN_ID",
  })
    .from("ALL_TAB_COLUMNS c")
    .where("c.OWNER", CURRENT_SCHEMA)
    .where("c.HIDDEN_COLUMN", "NO")
    .orderBy("c.TABLE_NAME", "c.COLUMN_ID")
    .compile("literal", { aliasQuote: '"' });
}

/** Primary-key columns (`CONSTRAINT_TYPE = 'P'`) for the current schema. */
export function primaryKeysQuery(): CompiledQuery {
  return select({ table_name: "cc.TABLE_NAME", column_name: "cc.COLUMN_NAME" })
    .from("ALL_CONSTRAINTS c")
    .innerJoin("ALL_CONS_COLUMNS cc", [
      eq("cc.OWNER", "c.OWNER"),
      eq("cc.CONSTRAINT_NAME", "c.CONSTRAINT_NAME"),
    ])
    .where("c.OWNER", CURRENT_SCHEMA)
    .where("c.CONSTRAINT_TYPE", "P")
    .orderBy("cc.TABLE_NAME", "cc.POSITION")
    .compile("literal", { aliasQuote: '"' });
}

/**
 * Foreign-key columns (`CONSTRAINT_TYPE = 'R'`). The referenced constraint is
 * resolved through `R_CONSTRAINT_NAME`; composite keys pair the two
 * `ALL_CONS_COLUMNS` rows by `POSITION`, which is the column's position inside
 * its constraint.
 */
export function foreignKeysQuery(): CompiledQuery {
  return select({
    table_name: "cc.TABLE_NAME",
    column_name: "cc.COLUMN_NAME",
    foreign_table: "rc.TABLE_NAME",
    foreign_column: "rcc.COLUMN_NAME",
  })
    .from("ALL_CONSTRAINTS c")
    .innerJoin("ALL_CONS_COLUMNS cc", [
      eq("cc.OWNER", "c.OWNER"),
      eq("cc.CONSTRAINT_NAME", "c.CONSTRAINT_NAME"),
    ])
    .innerJoin("ALL_CONSTRAINTS rc", [
      eq("rc.OWNER", "c.R_OWNER"),
      eq("rc.CONSTRAINT_NAME", "c.R_CONSTRAINT_NAME"),
    ])
    .innerJoin("ALL_CONS_COLUMNS rcc", [
      eq("rcc.OWNER", "rc.OWNER"),
      eq("rcc.CONSTRAINT_NAME", "rc.CONSTRAINT_NAME"),
      eq("rcc.POSITION", "cc.POSITION"),
    ])
    .where("c.OWNER", CURRENT_SCHEMA)
    .where("c.CONSTRAINT_TYPE", "R")
    .orderBy("cc.TABLE_NAME", "cc.POSITION")
    .compile("literal", { aliasQuote: '"' });
}
