/**
 * Catalog queries for ClickHouse.
 *
 * Introspection reads the `system` database: `system.tables` lists the current
 * database's tables (excluding views) and `system.columns` lists the columns of
 * one table, bound as the `{table:String}` query parameter.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { expr, fn, select } from "@easysql/query-builder";

/** Lists the tables of the current database, excluding views. */
export function tablesQuery(): CompiledQuery {
  return select({ table_name: "name", rows_approx: "total_rows" })
    .from("system.tables")
    .where("database", fn("currentDatabase"))
    .where(expr("engine NOT LIKE '%View'"))
    .orderBy("name")
    .compile("literal");
}

/** Lists the columns of one table, bound as `{table:String}`. */
export function columnsQuery(): CompiledQuery {
  return select({
    column_name: "name",
    data_type: "type",
    column_default: "default_expression",
    is_primary: "is_in_primary_key",
    ordinal: "position",
  })
    .from("system.columns")
    .where("database", fn("currentDatabase"))
    .where("table", expr("{table:String}"))
    .orderBy("position")
    .compile("literal");
}
