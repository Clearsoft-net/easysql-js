/**
 * Catalog queries for DuckDB.
 *
 * DuckDB exposes its catalog through table functions (`duckdb_tables()`,
 * `duckdb_constraints()`, `duckdb_columns()`), scoped to the current database
 * and schema.
 */

/** Base tables in the current database/schema, with an estimated size. */
export const TABLES_SQL = `SELECT table_name, estimated_size
         FROM duckdb_tables()
         WHERE NOT internal
           AND database_name = current_database()
           AND schema_name = current_schema()
         ORDER BY table_name`;

/** Primary- and foreign-key constraints of the current database/schema. */
export const CONSTRAINTS_SQL = `SELECT table_name,
                constraint_type,
                constraint_column_names,
                referenced_table,
                referenced_column_names
         FROM duckdb_constraints()
         WHERE database_name = current_database()
           AND schema_name = current_schema()
         ORDER BY table_name, constraint_index`;

/** Columns of one table (the table name is bound as `?`). */
export const COLUMNS_SQL = `SELECT column_name,
                  column_index,
                  data_type,
                  is_nullable,
                  column_default
           FROM duckdb_columns()
           WHERE database_name = current_database()
             AND schema_name = current_schema()
             AND table_name = ?
           ORDER BY column_index`;
