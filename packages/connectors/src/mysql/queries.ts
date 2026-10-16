/**
 * Catalog queries for MySQL/MariaDB.
 *
 * Introspection reads `information_schema` only. Foreign keys live in
 * `KEY_COLUMN_USAGE`: `information_schema.COLUMNS` has no `REFERENCED_*`
 * columns, so reading them from there fails on any database that has at least
 * one table.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { caseWhen, eq, isNotNull, lit, select } from "@easysql/query-builder";

/** Lists the base tables in the configured schema. */
export function tablesQuery(database: string): CompiledQuery {
  return select({ table_name: "TABLE_NAME", rows_approx: "TABLE_ROWS" })
    .from("information_schema.TABLES")
    .where("TABLE_SCHEMA", database)
    .where("TABLE_TYPE", lit("BASE TABLE"))
    .orderBy("TABLE_NAME")
    .compile("question");
}

/** Lists the columns of one table, with primary and foreign key metadata. */
export function columnsQuery(database: string, table: string): CompiledQuery {
  return select({
    column_name: "c.COLUMN_NAME",
    data_type: "c.DATA_TYPE",
    is_nullable: "c.IS_NULLABLE",
    column_default: "c.COLUMN_DEFAULT",
    is_primary: caseWhen(eq("c.COLUMN_KEY", lit("PRI")), lit(1), lit(0)),
    foreign_table: "k.REFERENCED_TABLE_NAME",
    foreign_column: "k.REFERENCED_COLUMN_NAME",
    ordinal: "c.ORDINAL_POSITION",
  })
    .from("information_schema.COLUMNS c")
    .leftJoin("information_schema.KEY_COLUMN_USAGE k", [
      eq("k.TABLE_SCHEMA", "c.TABLE_SCHEMA"),
      eq("k.TABLE_NAME", "c.TABLE_NAME"),
      eq("k.COLUMN_NAME", "c.COLUMN_NAME"),
      isNotNull("k.REFERENCED_TABLE_NAME"),
    ])
    .where("c.TABLE_SCHEMA", database)
    .where("c.TABLE_NAME", table)
    .orderBy("c.ORDINAL_POSITION")
    .compile("question");
}
