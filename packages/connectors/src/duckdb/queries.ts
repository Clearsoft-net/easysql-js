/**
 * Catalog queries for DuckDB.
 *
 * DuckDB exposes its catalog through table functions (`duckdb_tables()`,
 * `duckdb_constraints()`, `duckdb_columns()`), scoped to the current database
 * and schema.
 */

import type { CompiledQuery } from "@easysql/query-builder";
import { fn, not, select } from "@easysql/query-builder";

/** Base tables in the current database/schema, with an estimated size. */
export function tablesQuery(): CompiledQuery {
  return select({ table_name: "table_name", rows_approx: "estimated_size" })
    .from(fn("duckdb_tables"))
    .where(not("internal"))
    .where("database_name", fn("current_database"))
    .where("schema_name", fn("current_schema"))
    .orderBy("table_name")
    .compile("question");
}

/** Primary- and foreign-key constraints of the current database/schema. */
export function constraintsQuery(): CompiledQuery {
  return select({
    table_name: "table_name",
    constraint_type: "constraint_type",
    constraint_column_names: "constraint_column_names",
    referenced_table: "referenced_table",
    referenced_column_names: "referenced_column_names",
  })
    .from(fn("duckdb_constraints"))
    .where("database_name", fn("current_database"))
    .where("schema_name", fn("current_schema"))
    .orderBy("table_name", "constraint_index")
    .compile("question");
}

/** Columns of one table (the table name is bound as `?`). */
export function columnsQuery(table: string): CompiledQuery {
  return select({
    column_name: "column_name",
    column_index: "column_index",
    data_type: "data_type",
    is_nullable: "is_nullable",
    column_default: "column_default",
  })
    .from(fn("duckdb_columns"))
    .where("database_name", fn("current_database"))
    .where("schema_name", fn("current_schema"))
    .where("table_name", table)
    .orderBy("column_index")
    .compile("question");
}
