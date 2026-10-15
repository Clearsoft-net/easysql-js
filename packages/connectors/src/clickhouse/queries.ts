/**
 * Catalog queries for ClickHouse.
 *
 * Introspection reads the `system` database: `system.tables` lists the current
 * database's tables (excluding views) and `system.columns` lists the columns of
 * one table, bound as the `{table:String}` query parameter.
 */

/** Lists the tables of the current database, excluding views. */
export const TABLES_SQL = `SELECT name AS table_name, total_rows AS rows_approx
                FROM system.tables
                WHERE database = currentDatabase()
                  AND engine NOT LIKE '%View'
                ORDER BY name`;

/** Lists the columns of one table, bound as `{table:String}`. */
export const COLUMNS_SQL = `SELECT name AS column_name, type AS data_type,
                         default_expression AS column_default,
                         is_in_primary_key AS is_primary, position AS ordinal
                  FROM system.columns
                  WHERE database = currentDatabase() AND table = {table:String}
                  ORDER BY position`;
