/**
 * Catalog queries for the Trino engine.
 *
 * Introspection reads `information_schema`: `tables` for the base tables in the
 * current schema and `columns` for their column metadata.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { expr, select } from "@easysql/query-builder";

/**
 * Lists the base tables in the current schema. Trino's `current_schema` is a
 * keyword-like session function without parentheses, so it is emitted verbatim.
 */
export function tablesQuery(): CompiledQuery {
  return select({ table_name: "table_name" })
    .from("information_schema.tables")
    .where("table_schema", expr("current_schema"))
    .where("table_type", "BASE TABLE")
    .orderBy("table_name")
    .compile("literal");
}

/** Lists the columns of one table, inlining `tableName` as a literal. */
export function columnsQuery(tableName: string): CompiledQuery {
  return select({
    column_name: "column_name",
    data_type: "data_type",
    is_nullable: "is_nullable",
    column_default: "column_default",
    ordinal_position: "ordinal_position",
  })
    .from("information_schema.columns")
    .where("table_schema", expr("current_schema"))
    .where("table_name", tableName)
    .orderBy("ordinal_position")
    .compile("literal");
}
