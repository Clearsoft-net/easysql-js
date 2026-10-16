/**
 * Catalog queries for Snowflake.
 *
 * Introspection reads `INFORMATION_SCHEMA` only. `TABLES` lists the `BASE
 * TABLE`s in the current database/schema; `COLUMNS`, joined with
 * `KEY_COLUMN_USAGE` and `TABLE_CONSTRAINTS`, supplies the column metadata
 * together with primary and foreign keys.
 *
 * The constraint views are preferred over `SHOW PRIMARY KEYS` / `SHOW IMPORTED
 * KEYS` because they are plain SQL: they compose into a single query and return
 * one row per constraint column instead of the driver-specific `SHOW` shape.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { caseWhen, eq, fn, isNull, lit, ne, select } from "@easysql/query-builder";

/** Lists the `BASE TABLE`s in the current database/schema. */
export function tablesQuery(): CompiledQuery {
  return select({ table_name: "TABLE_NAME" })
    .from("INFORMATION_SCHEMA.TABLES")
    .where("TABLE_CATALOG", fn("CURRENT_DATABASE"))
    .where("TABLE_SCHEMA", fn("CURRENT_SCHEMA"))
    .where("TABLE_TYPE", "BASE TABLE")
    .orderBy("TABLE_NAME")
    .compile("literal");
}

/** Lists the columns of every table, with primary and foreign key metadata. */
export function columnsQuery(): CompiledQuery {
  return select({
    table_name: "c.TABLE_NAME",
    column_name: "c.COLUMN_NAME",
    data_type: "c.DATA_TYPE",
    is_nullable: "c.IS_NULLABLE",
    column_default: "c.COLUMN_DEFAULT",
    ordinal: "c.ORDINAL_POSITION",
    is_primary: caseWhen(isNull("pk.CONSTRAINT_TYPE"), 0, 1),
    foreign_table: "fk.TABLE_NAME",
    foreign_column: "fk.COLUMN_NAME",
  })
    .from("INFORMATION_SCHEMA.COLUMNS c")
    .leftJoin("INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku", [
      eq("ku.TABLE_CATALOG", "c.TABLE_CATALOG"),
      eq("ku.TABLE_SCHEMA", "c.TABLE_SCHEMA"),
      eq("ku.TABLE_NAME", "c.TABLE_NAME"),
      eq("ku.COLUMN_NAME", "c.COLUMN_NAME"),
    ])
    .leftJoin("INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk", [
      eq("pk.CONSTRAINT_CATALOG", "ku.CONSTRAINT_CATALOG"),
      eq("pk.CONSTRAINT_SCHEMA", "ku.CONSTRAINT_SCHEMA"),
      eq("pk.CONSTRAINT_NAME", "ku.CONSTRAINT_NAME"),
      eq("pk.CONSTRAINT_TYPE", lit("PRIMARY KEY")),
    ])
    .leftJoin("INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk", [
      eq("fk.CONSTRAINT_CATALOG", "ku.CONSTRAINT_CATALOG"),
      eq("fk.CONSTRAINT_SCHEMA", "ku.CONSTRAINT_SCHEMA"),
      eq("fk.CONSTRAINT_NAME", "ku.CONSTRAINT_NAME"),
      ne("fk.TABLE_NAME", "ku.TABLE_NAME"),
    ])
    .where("c.TABLE_CATALOG", fn("CURRENT_DATABASE"))
    .where("c.TABLE_SCHEMA", fn("CURRENT_SCHEMA"))
    .orderBy("c.TABLE_NAME", "c.ORDINAL_POSITION")
    .compile("literal");
}
